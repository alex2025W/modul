%import json
%import routine
%def styles():
  <link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/selectize.bootstrap2.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/client-finder.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/jquery.textcomplete.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/client.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/adaptive.css?v={{version}}" rel="stylesheet" media="screen, print">
%end
%def scripts():
  <script src="/static/scripts/statistics.js?v={{version}}"></script>
  <script src="/static/scripts/orderroutine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-slider.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/daterangepicker2.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>
  <script src="/static/scripts/libs/typeahead.bundle.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawinflate.js?v={{version}}"></script>
  <script src="/static/scripts/client-finder.js?v={{version}}"></script>
  <script src="/static/scripts/tools.js?v={{version}}"></script>
  <script>
    $(function(){
        bootbox.setDefaults({locale: "ru",});
        window.clients_tags = {{!clients_tags}};
        window.SOSTDAYS = $.parseJSON('{{!json.dumps(routine.get_sost_days())}}');
        window.WEEKENDS = $.parseJSON('{{!json.dumps(routine.get_weekends())}}');
        window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
        window.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
        window.DICTS = {{! json.dumps( dict(map(lambda x: (str(x.get('_id')), x.get('name')), dicts)) )}} ;
        window.DICTS.where_find = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 2])}}];
        window.DICTS.client_type = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 12])}}];
        window.DICTS.first_contact = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 1])}}];
        window.DICTS.reason = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 7])}}];
        window.DICTS.task = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 6])}}];
        window.DICTS.review = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 13])}}];
        window.DICTS.interests = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 14])}}];
        window.DICTS.condition = $.parseJSON('{{!json.dumps(map(lambda x: {'_id': str(x['_id']), 'name':x['name'], 'price':x['price'], 'sq': x['sq'] if 'sq' in x else 'disabled', 'property':x['property']}, filter(lambda i: i['type'] == 3, dicts)))}}');
        window.ORDER_CONDITIONS= {{!json.dumps(orders_conditions)}};
        // получаем сообщения для пользователей
        $.get('/handlers/msg', {}, 'json');
    });
</script>
  <script src="/static/scripts/crm/build/app.js?v={{version}}"></script>
  <script src="/static/scripts/select2.js?v={{version}}"></script>
  <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.textcomplete.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='CRM', current_user=current_user, show_failures_orders=show_failures_orders, version=version, scripts=scripts, styles=styles, menu=menu

<script id="orderTableTemplate" type="text/template">
<div class="span12" style="width:99%;">
  <div class="row add-order-pan">

    <div class="span10"></div>
  </div>

<div class="client-filters row alert-success toolbar" style="background-color: #eee;">
<div class="span12 client-filters__container collapse in">
<div class="row"><div class="span12"><a href="javascript:;"  data-toggle="collapse" data-target="#filter-pan" class="collapsed"><strong>Фильтры</strong></a></div></div>

<div id="filter-pan" class="row collapse">
  <div class="span7 form-group">
    <div class="row">
      <h4 class="span7">Заявки</h3>
    </div>
    <div class="row form-row">
      <div class="span3 form-control" style="max-width:200px;">
        <label class="manager-label">Менеджер<br>
          <a href="javascript:;" class="filter-favorite"><i data-status="off" class="fa fa-star-o" style="font-size:20px;"></i></a>
          <select class="span2" id="manager-filter" multiple="multiple">
                %for row in users: #[x for x in users if x.get('stat')!='disabled']:
                  %#manager = next((x for x in row['roles'] if x['role']=='531f287486a2fa0002934afb'), None)
                  %manager = False
                  %if row.get('stat')!='disabled':
                    %for x in row['roles']:
                      %if 'app' in x['pages'] and 'w' in x['pages']['app']:
                        %manager = True
                      %end
                    %end
                  %end
                  %if not manager:
                    %manager = row['email'] in activate_managers
                  %end
                  %if manager:
                    <option value="{{row['email']}}">{{row['fio'] if 'fio' in row else row['email']}}</option>
                  %end
                %end
          </select>
          <button class="btn btn-normal" id="apply-manager" style = "padding: 3px 4px 5px 4px;"><i class="icon-search"></i></button>
        </label>
      </div>
      <div class="span2 form-control" style="width:70px;">
        <label>Дата нач.<br>
            <a href="javascript:;" class="order-start-date-filter">Все даты</a>&nbsp;<a class="cancel-order-start-date-filter">&times;</a>
          </label>
      </div>
      <div class="span2 form-control" style="width:100px;">
      <label><!--<a class="date-filter down sel" href="javascript:;">Дата <span>&darr;</span></a>-->Дата посл.<br>
            <a href="javascript:;" class="order-date-filter">Все даты</a>&nbsp;<a class="cancel-order-date-filter">&times;</a>
          </label>
          <label class="checkbox"><input type="checkbox" id="only-new-date" />только новые</label>
      </div>
      <div class="span2 form-control a-w-100" style = "margin-left:0px; width:130px;">
        <label>Состояние<br>
            %cond = [i for i in dicts if i['type'] == 3]
            <select name="multiselect[]" multiple="multiple" class="span3" id="condition-filter2">
              <option data-property="начальное" value="начальное">Все начальные</option>
              <option data-property="промежуточное" value="промежуточное">Все в работе</option>
              <option data-divider="true" ></option>
              %for row in cond:
                  %if (str(row['_id']) == orders_conditions['REFUSE']):
                    %if show_failures_orders:
                       <option data-property="{{row['property']}}" value="{{row['_id']}}">{{row['name']}}&nbsp;-&nbsp;Любая причина</option>
                       %cond1 = [i for i in dicts if i['type'] == 7]
                       %for row1 in cond1:
                         <option data-property="отказ" value="{{row['_id']}} {{row1['name']}}">{{row['name']}}&nbsp;-&nbsp;{{!row1['name'].replace(' ',' ')}}</option>
                       %end
                    %end
                  %elif str(row['_id']) == orders_conditions['EXAMINE']:
                    <option data-property="{{row['property']}}" value="{{row['_id']}}">Рассм.&nbsp;-&nbsp;Любая причина</option>
                    %cond1 = [i for i in dicts if i['type'] == 13]
                    %for row1 in cond1:
                      <option data-property="{{row['property']}}" value="{{row['_id']}} {{row1['name']}}">Рассм.&nbsp;-&nbsp;{{!row1['name'].replace(' ',' ')}}</option>
                    %end
                  %elif str(row['_id']) == orders_conditions['INTEREST']:
                    <option data-property="{{row['property']}}" value="{{row['_id']}}">{{row['name']}}&nbsp;-&nbsp;Любая причина</option>
                    %cond1 = [i for i in dicts if i['type'] == 14]
                    %for row1 in cond1:
                      <option data-property="{{row['property']}}" value="{{row['_id']}} {{row1['name']}}">{{row['name']}}&nbsp;-&nbsp;{{!row1['name'].replace(' ',' ')}}</option>
                    %end
                  %else:
                    <option data-property="{{row['property']}}" value="{{row['_id']}}">{{row['name']}}</option>
                  %end
              %end
            </select>
            <button class="btn btn-normal" style = "padding: 3px 4px 5px 4px;" id="apply-condition"><i class="icon-search"></i></button>

        </label>
      </div>
    </div>
    <!--initiator-->
    <div class="row form-row">
          <div class="span4 form-control">
            <div class="span4 manager-label initiator-container"><span style = "float:left; margin-top: 8px">Инициатор контакта:</span>
                <select name="multiselect[]" multiple="multiple" class="span3 cb-initiator" style="margin:0 0 10px 5px">
                    <option value="first-we">Первый контакт, мы</option>
                    <option value="first-they">Первый контакт, они</option>
                    <option value="last-we">Последний контакт, мы</option>
                    <option value="last-they">Последний контакт, они</option>
                    <option value="we">Все контакты мы</option>
                    <option value="they">Все контакты они</option>
                </select>
                <button class="btn btn-normal" id="apply-manager" style = "padding: 3px 4px 5px 4px;margin-bottom:10px"><i class="icon-search"></i></button>
          <!--      <label class="checkbox" style = "float:left; margin-left: 10px"><input class = "cb-initiator" type="checkbox" data-initiator="we"  id="cb-initiator-we" />мы</label>
                <label class="checkbox" style = "float:left; margin-left:10px;"><input class = "cb-initiator" data-initiator = "they" type="checkbox" id="cb-initiator-they" />они</label>
                -->
            </div>
          </div>
    </div>
    <!--end initiator-->
  </div>
  <div class="span4 myspan4 form-control">
    <div class="row">
      <h4 class="span4">Плановые даты</h3>
    </div>
    <div class="row">
      <div class="span4">
        <label style = "float: left;">
          Договор:
          <a href="javascript:;" class="close-date-filter">Все даты</a>&nbsp;<a class="cancel-close-date-filter">&times;</a>
        </label>
        <label class="checkbox" title="без даты" style = "float: left; margin-left: 8px;">
          <input type="checkbox" id="no-close-date" />?
        </label>
      </div>
    </div>
    <div class="row">
      <div class="span4">
        <label style = "float: left;">
          Сдача:
          <a href="javascript:;" class="finish-date-filter">Все даты</a>&nbsp;<a class="cancel-finish-date-filter">&times;</a>
        </label>
        <label class="checkbox" title="без даты" style = "float: left; margin-left: 8px;">
          <input type="checkbox" id="no-finish-date" />?
        </label>
      </div>
    </div>
    <div class="row">
      <div class="span4">
        <label>Вероятность:
          <select class="span2" id="chance-select-filter" style = "min-width:120px; margin-top:6px;">
                <option value="all">Все</option>
                <option value="ls">С понижением</option>
                <option value="mr">С повышением</option>
                <option value="mth">Более 50%</option>
                <option value="no">Не определена</option>
          </select>

        </label>
      </div>
    </div>
  </div>
  <div class="span4 myspan4 form-control">
    <div class="row">
      <h4 class="span4">Задачи</h3>
    </div>
    <div class="row">
      <div class="span2 form-control">
        <label>
          Вид<br>
          <select class="span2" id="task-filter" style = "min-width:100px;">
              <option value="all">Все заявки</option>
              <option value="alltasks">Все задачи</option>
              %cond = [i for i in dicts if i['type'] == 6]
              %for row in cond:
                <option value="{{row['name']}}">{{row['name']}}</option>
              %end
          </select>
        </label>
      </div>
      <div class="span2">
        <label>
          <!--<a class="task-filter-sort down" href="javascript:;">Дата <span>&darr;</span></a>-->Дата<br>
          <a href="javascript:;" class="task-date-filter">Все даты</a>&nbsp;<a class="cancel-task-date-filter">&times;</a>
        </label>
      </div>
    </div>
  </div>
  <div class="span1 form-control">
    <div class="row"><h4 class="span1">Цена</h3></div>
    <div class="row">
      <div class="span1">
      <!--<a class="price-filter-sort down" href="javascript:;">Цена <span>&darr;</span></a>-->Цена
      <br><br>
        <a href="javascript:;" class="show-all-orders">Показать&nbsp;все</a>
      </div>
    </div>



  </div>
</div>
</div>
</div>


<div class="row alert-info toolbar">
<div class="span12 total-tables" style = "/* width:1200px */">
<div class="row"><div class="span12"><a href="javascript:;"  data-toggle="collapse" data-target="#itogo-pan"><strong>Итого</strong></a></div></div>

<div id="itogo-pan" class="row collapse out">
  <div class="span12">
    <strong>С любой вероятностью</strong>
    <div class="itogo-block1">
    </div>
  </div>
  <div class="span12">
    <strong>С вероятностью >50%</strong>
    <div class="itogo-block2">
    </div>
  </div>
</div>
</div>
</div>

<div class="row alert-error toolbar" style="background-color: #eee;">
<div class="span12">
<div class="row"><div class="span12"><a href="javascript:;"  data-toggle="collapse" data-target="#manager-pan"><strong>Текущая работа</strong></a></div></div>

<div id="manager-pan" class="row collapse out">
    <div class="managers-block">
    </div>
</div>

</div>
</div>

    <div class="row">
      <div class="span12" style="width:98%;">
      <table class = "order-table">
          <thead id = "sort-pan">
            <tr><td colspan="15" style = "height:30px;">&nbsp;</td></tr>
            <tr class = 'tr-actions'>

              <td>
                <a data-sort="f" class="sort-lnk sort-lnk-f" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Активность общая">АО</span><span class="sort-cancel"></span></a>
                <br/>
                <a data-sort="g" class="sort-lnk sort-lnk-g" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Активность значимая">АЗ</span><span class="sort-cancel"></span></a>
              </td>
              <td >
                  <a data-sort="0" class="sort-lnk sort-lnk-0" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Дата первого состояния">Дата нач.</span><span class="sort-cancel"></span></a>
              </td>
              <td>
                  <a data-sort="1" class="sort-lnk sort-lnk-1" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Количество дней от первого состояния до предпоследнего">Дней</span><span class="sort-cancel"></span></a>
              </td>
              <td>
                  <a data-sort="2" class="sort-lnk sort-lnk-2" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Дата предпоследнего состояния">Дата пред.</span><span class="sort-cancel"></span></a>
              </td>
               <td>
                  <a data-sort="3" class="sort-lnk sort-lnk-3" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Количество дней от предпоследнего состояния до последнего">Дней</span><span class="sort-cancel"></span></a>
                  (<a data-sort="a" class="sort-lnk sort-lnk-a" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Всего дней от первого состояния до последнего">Σ</span><span class="sort-cancel"></span></a>)
              </td>
               <td>
                  <a data-sort="4" class="sort-lnk sort-lnk-4" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Дата последнего состояния">Дата посл.</span><span class="sort-cancel"></span></a>
              </td>
              <td>
                  <a data-sort="d" class="sort-lnk sort-lnk-d" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Количество дней между последним состоянием и текущей датой">Дней до<br>сегодня</span><span class="sort-cancel"></span></a>
                  (<a data-sort="c" class="sort-lnk sort-lnk-c" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Количество дней между первым состоянием и текущей датой">Σ</span><span class="sort-cancel"></span></a>)
              </td>
               <td>
                  <a data-sort="5" class="sort-lnk sort-lnk-5" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name"  title = "Количество дней от последнего состояния до предполагаемой даты закрытия" >Дней</span><span class="sort-cancel"></span></a>
              </td>
               <td>
                 <a data-sort="6" class="sort-lnk sort-lnk-6" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Дата закрытия">Дата зак.</span><span class="sort-cancel"></span></a>
              </td>
              <td>
                 <a data-sort="e" class="sort-lnk sort-lnk-e" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Дата сдачи">Дата сд.</span><span class="sort-cancel"></span></a>
              </td>
               <td>
                  <a data-sort="7" class="sort-lnk sort-lnk-7" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Вероятность">%</span><span class="sort-cancel"></span></a>
              </td>
              <td>
                <span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Завод">Зав</span>
              </td>
              <td  style = "text-align:right">
                  <a data-sort="8" class="sort-lnk sort-lnk-8" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Площадь">Площадь, м<sup>2</sup></span><span class="sort-cancel"></span></a>
              </td>
              <td  style = "text-align:right">
                  <a data-sort="b" class="sort-lnk sort-lnk-b" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Ср. за м2"><nobr><strong>Ср. за м<sup>2</sup>, руб.</strong></nobr></span><span class="sort-cancel"></span></a>
              </td>
               <td style = "text-align:right; padding-right:5px;">
                  <a data-sort="9" class="sort-lnk sort-lnk-9" href="javascript:;"><span class="sort-arr"></span><span class="sort-num"></span><span class="sort-name" title = "Цена">Цена, руб.</span><span class="sort-cancel"></span></a>
              </td>
            </tr>
            <tr><td colspan="15" style = "height:30px;">&nbsp;<div style="float:right; position:relative;"><a class="clear-all-filters" title="Отключить многоуровневую сортировку" >x</a></div></td></tr>
          </thead>
      </table>
      </div>
    </div>

    <!-- paging -->
    <div class="row">
      <div class="span12 paginator" style = "width:98%">


        <ul class="pager">
          <li class="previous">
            <a href="javascript:;" class="prev-page">&larr; Предыдущие</a>
          </li>
          <li class="list-pager">
          </li>
          <li class="next">
            <a href="javascript:;" class="next-page">Следующие &rarr;</a>
          </li>
        </ul>

      </div>
    </div>
    <!---->

  </div>
  <div class="row" id="new-order-form"></div>
</div>
</script>


<script id="orderTableItemTemplate" type="text/template">
<tr class="order-projects">
  <td colspan="5"><%= obj.client_group?('Группа: [<a href="/crm#orders/&managers=0&cl=all&o=all&c=total&m=&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off&gr='+ obj.client_group  +'" style="font-weight:bold">'+obj.client_group+'</a>]&nbsp;&nbsp;'):'' %></td>
  <td colspan="7">Проекты заказчика:<br/>
    <% if(obj.projects && projects.length>0){%>
      <% for(var i in projects) {%>
        <%= (i==0)?'':',' %>
        <a href="/projects#search/<%= projects[i]['project_id'] %>"><%= projects[i].project_name %></a>
      <% } %>
    <%} else{%>
      &#8212;
    <%}%>
  </td>
  <td colspan = "3">
    Менеджер:&nbsp;<a class="manager-link" href="mailto:<%= manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[manager] %></a>
  </td>
</tr>
<tr class="order-head">
      <td colspan="5">
          <a hrefb="/client-card/<%= client_id %>" href = "javascript:;" class="client-card-lnk font18"><%= client %></a><br/>
          <% var clabc = window.App.clients_abc[client_id];
          if(clabc) {%>
            <span title='Текущая категория по подписанным договорам' style = "font-weight:bold; font-size: 12px;"  class="not-for-adaptive">Категория:
            <% if(clabc.price.is_a) {%>
              &nbsp;А по р.
            <% } else %>
            <% if(clabc.price.is_c) { %>
              &nbsp;С по р.
            <% } else if(!clabc.price.is_a && !clabc.price.is_c) { %>
              &nbsp;B по р.
            <% } %>
            <% if(clabc.square.is_a) {%>
              &nbsp;A по м2.
            <% } else  %>
            <% if(clabc.square.is_c) {%>
              &nbsp;C по м2.
            <% } else if(!clabc.square.is_a && !clabc.square.is_c){ %>
              &nbsp;B по м2.
            <% } %>
          </span>
          <% } %>

          <a href="/crm#orders/&cl=<%= client_id %>&o=all&c=total&m=&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off" class="by-client" data-client="<%= client_id %>" data-name="<%= client %>" style = "font-size: 12px;">Всего заявок: <%= window.App.clientcnt[client_id] %></a>

          <div style = "font-size:11px; line-height:120%!important;"><%= client_info.replace('<br>','<br>') %></div>
      </td>
      <td colspan="7">
          <a hrefb="/crm/<%= number %>#products" href = "javascript:;" class="order-structure-lnk font12"><%= structure %></a>
      </td>

      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' class="sort-lnk sort-lnk-8" data-sort="8"><span class="sort-arr"></span> Площадь, м2</span><br/>
          <span style = 'font-size:16px;' class="<%= approx_sq %>-approx"><strong><%= $.number( sq, 2, ',', ' ' ) %> </strong></span><br/><br/>
          <span style = 'font-size:12px; font-weight: bold; ' class="not-for-adaptive">&nbsp;
            <% if(obj.abc_type){
                if(abc_type.square.is_a) {%>
                  Категория А
                <% } else %>
                <% if(abc_type.square.is_c) { %>
                  Категория С
                <% } else if(!abc_type.square.is_c && !abc_type.square.is_a){%>
                  Категория B
                <%}
            }%>
          </span>
      </td>
      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' class="sort-lnk sort-lnk-b" data-sort="b"><span class="sort-arr"></span> Ср. за м2, руб.</span><br/>
          <span style = 'font-size:16px;' class="<%= approx_sq %>-approx"><strong>&nbsp;<%= Routine.priceToStr( (sq>0)?(price/sq):0, '', ' ') %> </strong></span><br/><br/>
          <span style = 'font-size:10px; ' >&nbsp;</span>
      </td>
      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' class="sort-lnk sort-lnk-9" data-sort="9"><span class="sort-arr"></span> Стоимость, руб.</span><br/>
          <span style = 'font-size:16px;' class="<%= approx %>-approx"><strong><%= Routine.priceToStr( price, '', ' ') %> <span title = "В цену включены доп. позиции"><%= (products && products.length>0 && services && services.length>0)?'*':''%></span></strong></span><br/>
          <span class="f-lft" style = 'font-size:11px;'>Наценка: <%=markup>0?markup.toString().replace('.',',')+'%':'-'%> </span><br/>
          <span style = 'font-size:12px; font-weight: bold; ' class="not-for-adaptive">&nbsp;
              <% if(obj.abc_type){
                if(abc_type.price.is_a) {%>
                  Категория А
                <% } else %>
                <% if(abc_type.price.is_c) { %>
                  Категория С
                <% } else if(!abc_type.price.is_c && !abc_type.price.is_a){%>
                  Категория B
                <%}
              }%>
          </span>
      </td>

</tr>
<tr class="order-details collapsed">
       <%   var fac = [];
            var contracts_nums = [];
            for(var q in obj.contracts){
              if(obj.contracts[q]['factory'] && fac.indexOf(obj.contracts[q]['factory'])<0)
                fac.push(obj.contracts[q]['factory'].substring(0,1).toUpperCase());
              contracts_nums.push(obj.contracts[q]['number']);
            } %>

      <td class="nowrap flex" style = "min-width:32px;">
        <div class="up" title="Активность Общая (АО)"><span class="sort-lnk sort-lnk-f" data-sort="f"><span class="not-for-desktop sort-arr"></span> <%=activity%></span></div>
        <div class="down" title="Активность значимая (АЗ)"><span class="sort-lnk sort-lnk-g" data-sort="g"><span class="not-for-desktop sort-arr"></span> <%=activity_significant%></span></div>
        <div class="down" title="АЗ / АО"><span class="sort-lnk sort-lnk-g" data-sort="g"><span class="not-for-desktop sort-arr"></span> <%= activity_percent %>%</span></div>
      </td>
      <td class = "nowrap" align="left" >

        <div class = "condition-date"><span class="not-for-desktop sort-lnk sort-lnk-0" data-sort="0"><span class="sort-arr"></span> Дата нач.: </span><%= Routine.smartDateStr(f_state_date)%></div><%= f_state_initiator+': '+window.DICTS[f_state] %>
        <br>
        <a class="manager-link" href="mailto:<%= f_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[f_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;"><span class="not-for-desktop sort-lnk sort-lnk-1" data-sort="1"><span class="sort-arr"></span> Дней: </span><span style = "font-size:14px;">→</span><%= (prelast_days_count &&  prelast_days_count>0 )?prelast_days_count:0%><span style = "font-size:14px">→</span>
      </td>
      <td class = "nowrap" align="left" ><div class = "condition-date"><span class="not-for-desktop sort-lnk sort-lnk-2" data-sort="2"><span class="sort-arr"></span> Дата пред.: </span> <%= Routine.smartDateStr(prelast_state_date)%></div>
         <%= prelast_state_initiator+': '+ window.DICTS[prelast_state] %>
         <br>
         <a class="manager-link" href="mailto:<%= prelast_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[prelast_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;" title="дней между предпоследним и последним (всего дней, от первого до последнего)."><span class="not-for-desktop sort-lnk sort-lnk-3" data-sort="3"><span class="sort-arr"></span> Дней (Σ): </span><span style = "font-size:14px">→</span><%= (last_days_count)?(last_days_count-(prelast_days_count?prelast_days_count:0)  ):0 %>(<%= (last_days_count )?last_days_count:0%>)<span style = "font-size:14px">→</span>
      </td>
      <td class="order-current-status nowrap">
          <strong>
              <div class = "condition-date"><span class="not-for-desktop sort-lnk sort-lnk-4" data-sort="4"><span class="sort-arr"></span> Дата посл.:</span></span> <%= Routine.smartDateStr(l_state_date) %></div>
              <% if (condition != '51ed3f738fe17600027069b5') { %>
                <a hrefb="/crm/<%= number %>#history" href = "javascript:;" class="order-history-lnk"><%= l_state_initiator+': '+window.DICTS[condition] %></a>
              <% } else { %>
                <span><%= l_state_initiator+': '+window.DICTS[condition] %></span>
              <% } %>
          </strong>
          <%= ((condition==window.ORDER_CONDITIONS['REFUSE'] || condition ==window.ORDER_CONDITIONS['EXAMINE'] || condition==window.ORDER_CONDITIONS['INTEREST']) && l_state_reason != '' )? '<br/>'+l_state_reason:'' %>
        <br>
        <a class="manager-link" href="mailto:<%= l_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[l_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;" title="количество дней между последним состоянием и текущей датой(количество дней между первым состоянием и текущей датой)."><span class="not-for-desktop sort-lnk sort-lnk-d" data-sort="d"><span class="sort-arr"></span> До сегодня (Σ): </span><span style = "font-size:14px">→</span><%= Routine.daysDiff(new Date(),Routine.parseDateTime(l_state_date,"dd.mm.yyyy h:i:s")) %>(<%= Routine.daysDiff(new Date(),Routine.parseDateTime(f_state_date,"dd.mm.yyyy h:i:s"))  %>)<span style = "font-size:14px">→</span>
      </td>

      <td class = "nowrap" style = "text-align:center;"><span class="not-for-desktop sort-lnk sort-lnk-5" data-sort="5"><span class="sort-arr"></span> Дней: </span><span style = "font-size:14px; ">→</span><span style ="<%=((close_days_count || close_days_count===0) && !cur_close_date)?'text-decoration:line-through':''%>"><%= close_days_count || close_days_count===0?close_days_count:'?' %></span><span style = "font-size:14px">→</span></td>

      <td class = "nowrap <%=chance>50 && !cur_close_date && condition_type!='закрывающее'?'error':'blue-condition'%> <%=last_close_date && last_close_date!='' && Routine.parseDate(last_close_date, 'dd.mm.yyyy' ) < new Date() && condition_type!='закрывающее' ? 'error1': '' %>"><div  class = "condition-date  " style = "<%=(last_close_date!=""&& !cur_close_date)?'text-decoration:line-through':''%> <%=(confirmed_by_client)?'font-weight:bold':''%>"><span class="not-for-desktop sort-lnk sort-lnk-6" data-sort="6"><span class="sort-arr"></span> Дата зак.: </span> <%= last_close_date?Routine.smartDateStr(last_close_date):'?' %></div>Договор
          <% for(var q in contracts_nums) { %>
            <%= (q>0)?",":"" %>
            <span><%= contracts_nums[q] %></span>
          <% } %>
      </td>
      <td class = "nowrap <%=last_finish_date && Routine.parseDate(last_finish_date, 'dd.mm.yyyy' ) < new Date() && condition_type!='закрывающее' ? 'error1': '' %>"  >
        <div  class = "condition-date  " style = "<%=(last_finish_date!='' && !cur_finish_date)?'text-decoration:line-through':''%> <%=(finish_confirmed_by_client)?'font-weight:bold':''%>">
          <span class="not-for-desktop sort-lnk sort-lnk-e" data-sort="e"><span class="sort-arr"></span> Дата сд.: </span> <%= last_finish_date?Routine.smartDateStr(last_finish_date):'?' %>
        </div>Сдача
      </td>
      <td class = "nowrap" ><span class="not-for-desktop sort-lnk sort-lnk-7" data-sort="7"><span class="sort-arr"></span> Вероятность: </span> <span class = "<%= chance_str.toString().indexOf('(-')>-1?'show-chance-str':''%>  "><strong><%= chance_str!="—" && chance_str!=undefined?chance_str +' %' :'?' %></strong></span></td>
      <td align="left" class = "nowrap"><span class="not-for-desktop">Зав.: </span>
        <span title="Завод">
          <%= (fac.length>0)?fac.join(", "):"–" %>
        </span>
      </td>
      <!--
      <td align="right" class = "nowrap"></td>
      <td align="right" class = "nowrap">Задачи:</td>
      -->
      <td colspan = "3" align="right" class = "nowrap1"><a hreb="/crm/<%= number %>#tasks" href = "javascript:;" class="show-tasks-lnk"><%= Routine.smartDateStr(task_date) %><br/><%= task %></a></td>
</tr>
<tr class="order-foot test">
      <td colspan="2" style = "font-size:11px;">
        <a href="javascript:;" data-status="<%= favorite %>" class="client-card-favorite fa fa-star<%= favorite=='on'?'':'-o' %>"></a>
        <a class = "lnk lnk-order-number" href = "/crm/<%= number %>"><%= number %><%= (state=='wait')?'&nbsp<span class="wait-state"><small style="font-size: 10px;color: gray;display: inline-block;">(В ожидании, <a style="cursor:pointer" class="client-card-public">в работу</a>)</small></span>':''%></a>
      </td>
      <td colspan="10" style = "vertical-align:top"><em><%= Routine.commentFormat(comment) %></em></td>
      <td colspan="3" style = "font-size:11px; text-align:right; vertical-align:top">
        <% var ha = true;
           if(glCurUser.admin!='admin'){
              for(var r=0;r<glCurUser.roles.length;++r){
                var role = glCurUser.roles[r];
                for(var p in role.pages){
                if(p=='app'){
                  if(role.pages[p]['additional'] && (role.pages[p]['additional'].type=='onlymy' || role.pages[p]['additional'].type=='shared')){
                    ha = false;
                  }
                }
              }
           }
           } %>


      </td>
</tr>
<tr>
      <td colspan="15" class="h60">&nbsp;</td>
</tr>
</script>



<script id="productTableTemplate" type="text/template">
  <div class="line-header" style = "margin-bottom:30px;">
      <span class = "lbl_header">Состав</span>
  </div>
  <div class="row">
    <div class="span6">
      <div class="form-inline">
      <label>Адрес доставки<br />
      <input type="text" value="<%= total_address %>" class="total-address span6" /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Стоимость доставки (руб)<br />
        <input value="<%= total_delivery %>" type="text" class="total-delivery span2" /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
      </label>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Монтаж (руб)<br />
        <input value="<%= total_montaz %>" type="text" class="total-montaz span2" /></label>
        <label><input type="checkbox" class="total-shef-montaz"> Шеф-монтаж</label>
      </div>
      <em>Оставить пустым, если разный монтаж</em>
      </label>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Наценка, %<br />
        <input value="<%= markup? markup.toString().replace('.',','):'0' %>" type="text" class="markup span2" /></label>
      </div>
      <!--<em>Оставить пустым, если разная наценка</em>-->
      </label>
    </div>
  </div>
  <div class="row row-collapsible">
    <fieldset class="collapsible">
    <legend>Основные позиции</legend>
    <table class="table span10 products-table" style = "width:95%">
        <div class="linked-orders" data-id="">
            <input type="text" class="linked-order-list" />
            <div class="btn btn-info fa fa-save save-linked-orders"></div>
        </div>
      <caption class="text-left"></caption>
      <thead>
        <tr>
          <th><strong>Назначение</strong></th>
          <th><strong>Тип</strong></th>
          <th><strong>Кол-во (ед.)</strong></th>
          <th><strong>Площадь общая (кв.м)</strong></th>
          <th><strong>Стоимость товара (руб.)</strong></th>
          <th><strong>Стоимость доставки (руб.)</strong></th>
          <th><strong>Стоимость монтажа (руб.)</strong></th>
          <th><strong>Стоимость общая (руб.)</strong></th>
        </tr>
      </thead>
      <tfoot>
          <tr>
            <td></td>
            <td class="text-right"><strong>Итого:</strong></td>
            <td><span class="total-num"></span></td>
            <td><span class="total-sq"></span></td>
            <td><span class="total-price-goods"></span></td>
            <td><span class="total-price-delivery"></span></td>
            <td><span class="total-price-montag"></span></td>
            <td><span class="total-price" style="font-weight:bold;"></span></td>
          </tr>
      </tfoot>
      <tbody></tbody>
    </table>
    <div class="span7 text-right" style = "float:right; margin-top:25px;">
      <a href="javascript:;" class="add-new-position btn btn-warning"><span>+</span> Добавить позицию</a>
    </div>
    <div class="span2"></div>
    </fieldset>
  </div>
  <div class="row row-collapsible">
      <fieldset class="collapsible">
      <legend>Доп. позиции</legend>
      <div class="row" style = "padding-top:40px;">
        <div class="control-group span12" style="margin-left:30px;">
            Любые товары и услуг, не относящиеся к основной продукции. <em style="font-size:inherit;">Например, монтаж, демонтаж, котельная, наружные сети, рабочая документация и т.п.</em>
         </div>
         <% if(services && services.length>0) { %>
        <table class="table span10 services-table" style = "width:95%">
          <caption class="text-left"></caption>
          <thead>
            <tr>
              <th><strong>Название</strong></th>
              <th><strong>Тип</strong></th>
              <th><strong>Цена (руб.)</strong></th>
              <th><strong>Продукция</strong></th>
            </tr>
          </thead>
          <tfoot>
              <tr>
                <td></td>
                <td class="text-right"><strong>Итого:</strong></td>
                <td><span class="serv-total-price"></span></td>
                <td></td>
              </tr>
          </tfoot>
          <tbody>

          </tbody>
        </table>
        <div class="span2"></div>
        <% } %>
      </div>

      <div class="row" style = "width:100%">
      <div class="span12 text-right" style="float:right;">
      </div>
      </div>
      <div class="row" style = "width:100%">
        <div class="span6 text-right" style = "float:right">
          <a href="javascript:;" class="add-new-service btn btn-warning" <%= (!App.glHasAccess &&  obj['_id'])?'style="display:none"':'' %>><span>+</span> Добавить доп. позицию</a>
        </div>
      </div>
  </fieldset>
  </div>

  <div class="row" style = "margin-bottom:25px; width:100%">
    <div class="span6 total-money">Общая стоимость заявки: <span class="<%= approx %>-approx"></span> руб.</div>
  </div>

  <div class="row row-collapsible">
    <fieldset class="collapsible">
    <legend>Проекты заказчика</legend>
    <div class="form-horizontal customer-project-block" style="margin-top:40px;">
        <div class="control-group span12" style="width:100%;">
          <div class="span12 projects-list-container" style="position:relative;">
            <input type="text" class="projects-list" />
          </div>
        </div>
      </div>
    </fieldset>
  </div>


  <div class="row" style = "width:100%; margin-top:10px;">

    <div class="span5">
        <div class="controls">
          <label>Поиск похожих заявок</label>
          <select multiple class="span4 like-props">
              <option value="1">Площадь</option>
              <option value="2">Адрес доставки</option>
              <option value="3">Назначение продукции</option>
          </select>&nbsp;<button class="find-like btn">Найти</button>
        </div>
    </div>

    <div class="span4 text-right" style = "float:right;margin-top: 22px;margin-right: 10px;margin-left:-20px">
        &nbsp;Тендер
        <select class="is-tender" style="width: auto;">
            <option value="no"<%= (is_tender=='no')?' selected':'' %> >нет</option>
            <option value="unknown"<%= (is_tender=='unknown')?' selected':'' %> >неизвестно</option>
            <option value="we-open"<%= (is_tender=='we-open')?' selected':'' %> >участвуем мы, открытый</option>
            <option value="we-closed"<%= (is_tender=='we-closed')?' selected':'' %> >участвуем мы, закрытый</option>
            <option value="they-open"<%= (is_tender=='they-open')?' selected':'' %> >участвует клиент, открытый</option>
            <option value="they-closed"<%= (is_tender=='they-closed')?' selected':'' %> >участвуем клиент, закрытый</option>
        </select>
    </div>

  <div class="span5 text-right correspondent-block" style="float:right;margin-top: 22px;margin-right: 10px;">
  </div>

  </div>


  <div class="row" style="width:100%">
      <div class="span7 text-right" style = "float:right;">
          <a href="javascript:;" class="save-and-close btn btn-info">Сохранить</a>
      </div>
  </div>
  <div class="row">
    <div class="span12" style = 'margin-top:40px;'>
      <div class="similar-list"></div>
    </div>
  </div>
</script>

<script id="correspondentTemplate" type="text/template">
<div class="controls">
    <div id="correspondent-dropdown" style="<% if(!need_display) { %>display:none;<% } %>position:relative">
        &nbsp;Заказчик&nbsp;тендера
        <input type="text" id="correspondent" autocomplete="off" placeholder="Заказчик тендера" style="margin:0" value="<%=(correspondent)?Routine.trim(correspondent).replace(/\"/g,'&quot;'):''%>" />
    <div id="cor-exists" class="alert alert-warning hide">
        Введённое название существует в БД. Установить связь?&nbsp;&nbsp;<a id="select-corr" class="btn" href="javascript:;">Выбрать</a>
    </div>
    <ul id="corr-dropdown-menu" class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu"></ul>
</div>
</script>

<script  id="likeItemTemplate" type="text/template">
<dt>Заявка № <a target="_blank" href="/crm/<%= number %>"><%= number %></a></dt>
<dd>
  <ul>
    <li>Первое состояние: <%= f_state %> (<%= f_state_date %>); последнее состояние: <%= l_state %> (<%= l_state_date %>)</li>
    <li>Состав заявки: <%= structure %></li>
    <li>Площадь: <%= $.number(sq, 2, ',', ' ' ) %></li>
    <li>Цена: <%= $.number(price, 2, ',', ' ' ) %></li>
    <li>Заказчик: <%= client %></li>
    <li>Контакты: <%= contacts %></li>
    <li>Менеджер: <%= window.MANAGERS[manager] %> (<%= manager %>)</li>
  </ul>
</dd>
</script>


<script id="productTableItemTemplate" type="text/template">
  <td><span title="Связать с другими заявками" class="fa fa-link product-links<% if(linked_orders.length > 0) { %> filled<% } %>"></span><%= name %></td>
  <td><a class="show-position" href="javascript:;"><%= type %></a></td>
  <td><%= count %></td>
  <% var delivery = 0; var montag = 0;
     for(var p in obj.positions) {
      delivery+=Routine.strToFloat(obj.positions[p].delivery||0);
      montag+=Routine.strToFloat(obj.positions[p].mont_price||0)*(obj.positions[p].mont_price_type?1:parseInt(obj.positions[p]['num']));
     }%>
  <td><span class="<%= approx_sq %>-approx"><%= $.number( sq*count, 2, ',', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price*count, '', ' ') %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( delivery, '', ' ') %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( montag, '', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price*count+delivery+montag, '', ' ' ) %></span></td>

</script>

<script id="positionTableTemplate" type="text/template">
<div class="span12">
  <div class="row">
    <div class="span3">
      %target = [i for i in dicts if i['type'] == 5]
      %trgs = []
      %for row in target:
          %trgs.append(row['name'])
      %end
       <label>Назначение:<br />
       <input
              autocomplete="off"
              data-source="{{json.dumps(trgs)}}"
              class="constuction-target"
              value="<%= name %>"
              type="text">
      </label>
    </div>
    <div class="span2">
      <label>Тип:<br /><select class="construction-type">
            %type = [i for i in dicts if i['type'] == 4]
              %for row in type:
                <option value="{{row['name']}}">{{row['name']}}</option>
              %end
        </select>
      </label>
    </div>
    <div class="span2">
      <label>Цена за ед. (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" class="construction-price"></label>
      <label><input type="checkbox" class="isapprox"> Ориентировочная</label>
    </div>
    <div class="span2">
      <label>Площадь ед. (кв.м):<br /><input type="text" value="<%= sq.toString().replace('.',',') %>" class="construction-sq"></label>
      <label><input type="checkbox" class="isapprox-sq"> Ориентировочная</label>
    </div>
    <div class="span3">
      <label class="gabar">Габариты (м):</label>
        <input type="text" value="<%= length %>" placeholder="Д" class="construction-length span1">
        <input type="text" value="<%= width %>" placeholder="Ш" class="construction-width span1">
        <input type="text" value="<%= height %>" placeholder="В" class="construction-height span1">
    </div>
  </div>
  <div class="row">
    <div class="span5">

    </div>
    <div class="span7 form-inline">

    </div>
  </div>
  <div class="row">
    <div class="span12">
      <label class="checkbox"><input type="checkbox" class="is_complect" <%= is_complect?"checked":'' %> />Комплект</label>
    </div>
  </div>
  <div class="row">
    <hr class="span12" style="margin-top:0px;">
  </div>
  <div class="row">
          <div class="span1"><strong>Кол-во ед.*</strong></div>
          <div class="span4"><strong>Адрес доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
          <div class="span3"><strong>Стоимость доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
          <div class="span3"><strong>Монтаж</strong><br><em>Оставить пустым, если монтаж не требуется или монтаж общий</em></div>
          <div class="span1"></div>
  </div>
  <div class="products-table"></div>
  <div class="row">
    <div class="span12">
      * если "Комплект" ввести кол-во штук в комплекте
    </div>
    <div class="span12 text-right bottom-spance">
      <a href="javascript:;" class="btn add-addr">Добавить адрес</a>
    </div>
  </div>
  <div class="row">
    <h3 class="span12">Итого</h3>
  </div>
  <div class="row" style = "width:100%">
    <div class="span6">
      <div class="row">
        <div class="span3 text-right">Стоимость товара: </div>
        <div class="span3"><span class="pos-total-price"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Стоимость монтажа: </div>
        <div class="span3"><span class="pos-total-montaz"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Стоимость доставки: </div>
        <div class="span3"><span class="pos-total-delivery"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Всего: </div>
        <div class="span3"><span class="pos-total-all"></span></div>
      </div>
    </div>
    <div class="span6">
      <div class="row">
        <div class="span3 text-right">Площадь: </div>
        <div class="span3"><span class="pos-total-sq"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Цена за кв.м.: </div>
        <div class="span3"><span class="pos-total-kvm"></span></div>
      </div>
    </div>

  </div>
  <div class="row">
    <div class="span12 text-right">
      <a href="javascript:;" class="btn btn-success save-position">Сохранить и закрыть</a>
      <a href="javascript:;" class="btn btn-info save-add-position">Сохранить и добавить сл.</a>
      <a href="javascript:;" class="btn btn-danger remove-position hide">Удалить позицию</a>
      <a href="javascript:;" class="btn close-position">Закрыть</a>
    </div>
  </div>
</div>
</script>

<script id="positionItemTemplate" type="text/template">
<div class="row">
  <div class="span1">
    <input type="text" value="<%= num %>" class="pos-number" >
  </div>
  <div class="span4">
    <input type="text" value="<%= addr %>" class="pos-addr" >
  </div>
  <div class="span3">
    <input type="text" value="<%= obj.delivery?Routine.priceToStr(delivery, '', ' '):'' %>" class="pos-delivery" >
  </div>
  <div class="span3">
    <div class="input-prepend">
      <input type="text" value="<%= mont_price?Routine.priceToStr(mont_price, '', ' '):'' %>" class="mont-price" style="margin-right: -1px; display: inline-block; border-radius: 4px 0 0 4px; width:90px;" >
      <select style="width:120px;" class="mont_type" disabled>
        <option value="0" <%= obj.mont_price_type?'':'selected' %> >за единицу</option>
        <option value="1" <%= obj.mont_price_type?'selected':'' %>>за все единицы</option>
      </select>
    </div>
    <label class="checkbox"><input type="checkbox" <%= shmontcheck %> class="pos-shmont"> Шеф-монтаж</label>
  </div>
  <div class="span1">
  <a class="remove-addr" href="javascript:;">&times;</a>
  </div>
</div>
</script>



<div id="client-find-form">
    <a class="collapser collapsed">Поиск</a>
    <div class="row collapsed">
    <div class="span4">
        <div class="row form-inline">
            <label class="span1" style="float:left;" for="client-dropdown">Клиент:</label>
            <div class="span4">
                <div class="client-finder-box">
                  <input class="client-finder" type="text" id="client-dropdown" placeholder="">
                  <span class="finder-loader"></span>
                </div>
            </div>
            <a href = "" class="lnk lnk-open-client-card" style = "line-height:2; display:none;" title = "Открыть карту клиента" >
                  <i class="fa fa-user"></i>
            </a>&nbsp;&nbsp;
            <label style = "line-height:1; min-height:0px; display:none;"  class="checkbox"><input type="checkbox" class="cl-checkbox" >&nbsp;Ч-Л</label>
        </div>
    </div>
     <div class="span4">
        <div class="row form-inline">
            <label class="span1"  style="float:left;" for="project-dropdown">Проект:</label>
            <div class="span4">
                <div class="project-finder-box">
                  <input class="project-finder" type="text" id="project-dropdown" placeholder="">
                  <span class="finder-loader"></span>
                </div>
            </div>
            <a href = "" class="lnk lnk-open-project-card" style = "line-height:2; display:none;" title = "Открыть проект" >
                  <i class="fa fa-eye"></i>
            </a>
        </div>
    </div>
    <div class="span4">
        <div class="row form-inline">
            <label class="span1" for="order-dropdown">Заявка:</label>
            <div class="span4">
                <div class="order-finder-box">
                  <input class="order-finder" type="text" placeholder="номер">
                  <span class="finder-loader"></span>
                </div>
            </div>
            <a href = "" class="lnk lnk-open-project-card" style = "line-height:2; display:none;" title = "Открыть проект" >
                  <i class="fa fa-eye"></i>
            </a>
        </div>
    </div>
    <div class="client-find-form__actions span3 text-right" style = "float:right">
      <!-- <a href="javascript:;" class="btn" id="show-orders">Показать заявки</a> -->
      <!--<a href="javascript:;" id="show-client-card"  class="btn btn-primary hide">Карточка клиента <span>&darr;</span></a>
      <a href="javascript:;" id="show-new-client-card" class="btn btn-primary">Новый клиент <span>&darr;</span></a>
      <a href="javascript:;" id="add-new-order" class="btn btn-success hide"><span>+</span> Добавить заявку</a> -->
      <a href="javascript:;" id="add-new-order-quick" class="btn btn-warning"><span>+</span> Быстрый ввод</a>
  </div>
  </div>
</div>



<div id="client-card-form" class="span12 hide"></div>

<div id="client-orders-list" style="display:none;" ></div>

<div id="products-list" class="span12 hide" style = "width:100%"></div>

<div id="history-modal" class="modal-dlg hide"data-backdrop="static" tabindex="-1" role="dialog" aria-hidden="true">
    <div class="modal-rel-container">
        <div class="history-data modal" style = "padding-bottom: 110px;" data-backdrop="static" tabindex="-1" role="dialog" aria-hidden="true"></div>
    </div>
</div>

<div id="task-modal" class="modal hide" data-backdrop="static" tabindex="-1" role="dialog" aria-hidden="true"></div>

<div id="client-card-modal" class="modal-dlg hide" data-backdrop="static" tabindex="-1" role="dialog" aria-hidden="true">
  <div class="modal-rel-container">
    <div class="card-data modal" data-backdrop="static" tabindex="-1" role="dialog" aria-hidden="true">

    </div>
  </div>
</div>

<div id="position-modal" class="modal hide" data-backdrop="static" role="dialog" aria-hidden="true"></div>


<script id="confirmSaveChangesTemplate" type="text/template">
  <div id="" style="position:fixed; width:100%; height:100%; left:0; top:0; background:rgba(0,0,0,0.8); z-index: 9000;">
    <div class="modal">
      Укажите причину изменения состава заявки:
      <textarea style="width:98.5%; height:100px;"></textarea>
      <div class="row">
        <div class="span12 text-right" style = "float:right">
          <a href="javascript:;" class="save-and-close btn btn-info">Сохранить</a>
          <a href="javascript:;" class="close-form btn btn-default">Отменить</a>
        </div>
      </div>
    </div>
  </div>
</script>

<script id="serviceEditForm" type="text/template">
  <div class="span12 service-edit-form">
    <div class="row">
      <div class="span3">
        <label>Название:</label>
      </div>
      <div class="span7">
        <input type="text" value="<%= name.replace(/"/g, '&quot;') %>"  class="construction-name" style="width:100%;" />
      </div>
    </div>
    <div class="row">
      <div class="span3">
        <label>Тип:<br />
          <select class="service-type">
            %type = [i for i in dicts if i['type'] == 9]
            %for row in type:
              <option value="{{row['name']}}">{{row['name']}}</option>
            %end
          </select>
        </label>
      </div>
      <div class="span2">
        <label>Цена (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" <%= (product_include=='yes')?'disabled':'' %> class="construction-price"></label>
      </div>
      <div class="span3">
        <br />
        <label class="checkbox"><input type="checkbox" class="is_approx" <%= (approx=='yes')?'checked':'' %>>Цена ориентировочная</label>
      </div>
      <div class="span4">
        <br />
        <label class="checkbox"><input type="checkbox" class="isinclude_product" <%= (product_include=='yes')?'checked':'' %> >Цена включена в стоимость товара</label>
      </div>
    </div>
    <div class="row">
       <div class="form-inline">
        <label class="checkbox"><input type="checkbox" class="by_production" <%= by_production?'checked':'' %> />для определенной продукции</label>
      </div>
    </div>
    <div class="productions-table row" style="<%= (!by_production)?'display:none;':'' %>">
      <div class="pr-header ">
        <span class="span1">№</span>
        <span class="span11">Наименование</span>
      </div>
      <% for(var i in productions) { %>
        <div class="pr-line">
          <span class="span1"><%= productions[i].number %></span>
          <div class="span11">
            <span class="title"><%= productions[i].name %></span>
            <div class="units form-inline">
              <label class="checkbox"><input type="checkbox" class="payment-all-units" /> <b>Все</b></label>&nbsp;
              <% for(var j=0;j<productions[i].count;++j) {%>
                <% var is_chk = false; for(var u in units) if(units[u].production_id==productions[i]._id && units[u].unit_number==(j+1)) is_chk=true; %>
                <label class="checkbox"><input type="checkbox" data-production="<%= productions[i]._id %>" data-number="<%= (j+1) %>" <%= is_chk?'checked':'' %> /> <%= (j+1) %></label>&nbsp;
              <% } %>
            </div>
          </div>
        </div>
      <% } %>
    </div>
      <div class="row" style="padding-top:20px">
        <label>Примечание:</label>
        <textarea class="construction-note" style="width:945px"><%= note %></textarea>
      </div>
     <div class="row">
        <div class="span12 text-right">
          <a href="javascript:;" class="btn btn-success save-position">Применить и закрыть</a>
          <a href="javascript:;" class="btn btn-info save-add-position">Применить и добавить сл.</a>
          <a href="javascript:;" class="btn btn-danger remove-position <%= (is_new)?'hide':'' %>">Удалить</a>
          <a href="javascript:;" class="btn close-position">Закрыть</a>
        </div>
      </div>

  </div>
</script>

<script id="serviceTableItemTemplate" type="text/template">
  <td><a class="show-position" href="javascript:;"><%= name %></a></td>
  <td><%= type?type:"Неизвестно" %></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td>
    <% if(!by_production) { %>
          (вся продукция)
    <% } else { %>
      <% /*группируем юниты по продукции */ %>
      <% var prod_gr = {}; %>
      <% for(var i in units) { %>
            <% var u = units[i]; %>
            <% if(u.production_id in prod_gr)
                prod_gr[u.production_id].push(u.unit_number);
              else prod_gr[u.production_id] = [u.unit_number]; %>
          <% } %>
          <% /* выводим группы */ %>
          <% for(var i in prod_gr) { %>
             <% for(var j in productions) { %>
               <% if(productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <div class="line">
              Ед. продукции:
              <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
             </div>
          <% } %>
    <% } %>
  </td>
</script>