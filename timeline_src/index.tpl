<!DOCTYPE html>
<html class="">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <title>Калуга. График производства.</title>
  <meta name="viewport" content="width=device-width">

  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/jquery.jgrowl.css?v={{version}}" rel="stylesheet" >
  <link rel="stylesheet" href="css/main.css?v={{version}}">
  <link rel="stylesheet" href="css/html.css?v={{version}}">
  <link rel="stylesheet" href="css/svg.css?v={{version}}">
  <link rel="stylesheet" href="css/print.css?v={{version}}" media="print">
  <script>var require = {config: {'app': {contracts: '{{contracts}}' }}};</script>

  <script data-main="js/main" src="js/libs/require.js?v={{version}}"></script>
  <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawinflate.js?v={{version}}"></script>
  <!--<script src="/static/bootstrap/js/bootstrap.min.js?v={{version}}"></script>-->
  <script>
    window.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
  </script>

</head>
<body id = "main_body">
  <div id="spinner"> Загрузка </div>

  <div id="auth-error" style="display: none">
    <span class="close">&times;</span>
    <h4>Не удалось загрузить данные</h4>
    <div class="message message-0">
      <a href="/timeline/api/check_auth">
        Убедитесь, что Вы авторизированы и у Вас открыт доступ.
      </a>
    </div>
    <div class="message message-1">
      При обработке данных возникла ошибка.<br/>
      Для устранения проблемы обратитесь к разработчикам.
    </div>
    <div class="exception"></div>
  </div>


  <section id="app" style="display: none">
    <div id="comments-container" style="display: none"></div>
    <div id="info-panel" style="display:none">
      <span title="Скрыть/Открыть инфо-панель" class="toggle-button glyphicon glyphicon-expand"></span>
      <div class="welcome">
        <h2>Информационная панель</h2>
        Здесь выводится дополнительная информация об активных объектах
      </div>
      <div class="content"></div>
    </div>
    <header>
      <div id="topline">
        <span class = "lbl">{{!('Режим редактирования' if mode=='edit' else 'Режим просмотра')}}</span>
        <div id="stats-button" class="btn-group" style="display: none">
          <button type="button" title="Даты начала работ" class="btn btn-mini" data-toggle="modal" data-target="#stats-modal">
            <span class="glyphicon glyphicon-list-alt"></span>
          </button>
        </div><div id="user-menu" class="btn-group"  style="display: none">
          <button class="btn btn-mini dropdown-toggle" data-toggle="dropdown">
            <span class="glyphicon glyphicon-user"></span>
            <span class="caret"></span>
          </button>
          <ul class="dropdown-menu pull-right" role="menu">
            <!-- #user-menu-template here -->
          </ul>
        </div>
      </div>
      <nav>

        <!-- <div id="size-menu" class="btn-group" >
        </div> -->

        <div id="view-menu" class="btn-group" style="display:none">
          <button class="btn btn-default btn-size-plus" type="button">
            <span class="fa  fa-search-plus" ></span>
          </button>
          <button class="btn btn-default btn-size-minus" type="button">
            <span class="fa  fa-search-minus"></span>
          </button>
          <button class="btn dropdown-toggle" data-toggle="dropdown" title="Слои">
            <span class="fa fa-eye"></span>
            <span class="caret"></span>
          </button>
          <span class="bs-badge"></span>
          <ul class="dropdown-menu">
            <!-- #view-menu-template here -->
          </ul>
        </div>

        <div id="completed-filter-111" class="btn-group" style="display: none">
          <button type="button" class="switch btn btn-default" title="Показать/скрыть выполненные">
            <span class="glyphicon glyphicon-ok"></span>
          </button>

          <button type="button" class="btn btn-default dropdown-toggle"
            data-depth="work" data-toggle="dropdown">
            <span class="label">работы</span>
            <span class="caret"></span>
          </button>

          <ul class="dropdown-menu">
            <li class="dropdown-header">Скрыть выполненные</li>
            <li><a data-depth="contract" href="#contract">Договоры</a></li>
            <li><a data-depth="order" href="#order">Заказы</a></li>
            <li><a data-depth="workorder" href="#workorder">Наряды</a></li>
            <li><a data-depth="work" href="#work">Работы</a></li>
          </ul>
        </div>

        <!-- SELECTORS -->

        <select id="selector-contract" name="selector_contracts[]" title="Все договоры"
            data-selected-text-format="count>4"
            data-size="7"
            data-width="fit"
            class="selectpicker selector" multiple style="display:none">
        </select>

        <select id="selector-order" name="selector_orders[]" title="Все заказы"
            data-selected-text-format="count>4"
            data-size="7"
            data-width="fit"
            class="selectpicker selector" multiple style="display:none">
        </select>

        <select id="selector-work-type" name="selector_worktypes[]" title="Все направления"
            data-selected-text-format="count>3"
            data-width="fit"
            class="selectpicker selector" multiple style="display: none">
        </select>

        <select id="selector-sector" name="selector_sectors[]" title="Все участки"
            data-selected-text-format="count>5"
            data-size="7"
            data-width="fit"
            class="selectpicker selector" multiple style="display: none">
        </select>

        <select id="selector-status" name="selector_status[]" title="Все статусы работ"
            data-selected-text-format="count>3"
            data-size="7"
            data-width="fit"
            class="selectpicker selector" multiple style="display: none">
        </select>



        <div id="search" style="display: none">
          <div class="tooltip">
            Раскрыть график до результатов поиска (нажмите <span>Enter ⏎</span>)
          </div>
          <div class="input-group">
            <input type="search" name="search-order" class="form-control" placeholder="Поиск...">
            <span class="input-group-btn">
              <button class="btn btn-default" type="button">
                <span class="fa fa-search-plus" aria-hidden="true"></span>
              </button>
            </span>
          </div>
        </div>


        <div id="sort" style="display: none">
          сортировать по:
          <a href="#sort_by_orders" title="Сначала номер договора, затем номер вида продукции, затем номер ед. продукции"
            >заказам</a>
          <a href="#sort_by_last_routine" title="Сортировка по порядку работ участка, имеющего фактические работы"
            >готовности</a>
          <a href="#sort_by_date_start" title="Сортировка по дате начала плановых или фактических работ"
            >началу</a>
          <a href="#sort_by_date_finish" title="Сортировка по дате окончания плановых или фактических работ"
            >окончанию</a>
        </div>
        <div id="completed-filter">
          скрыть выполненные:
          <a data-depth="contract"  href="#contract" title="Скрыть выполенные договоры">договоры</a>
          <a data-depth="order"  href="#order" title="Скрыть выполенные заказы">заказы</a>
          <a data-depth="workorder"  href="#workorder" title="Скрыть выполенные наряды">наряды</a>
          <a data-depth="work"  href="#work" title="Скрыть выполенные работы">работы</a>
        </div>


        <div id="reset">
          <a href="#">Сбросить все фильтры</a>
        </div>
      </nav>
      <svg id="axis">
        <g class="axis months"></g>
        <g class="axis days"></g>
        <g id="date-ranges"></g>
      </svg>
    </header>
    <svg id="canvas">
      <defs></defs>
      <g id="grid"></g>
      <g id="today"></g>
      <g id="day-highlight"></g>
      <g id="day-select"></g>
      <g id="horizontal-grid"></g>
      <rect class="background emptiness"/>
      <g id="main">
        <g id="timelines"></g>
        <g id="cell-highlight"></g>
        <g id="nodes"></g>
      </g>
    </svg>
    <footer style = "display:none">
      <p>© 2013–2015 <a href="http://www.modul.org" target="_blank">ООО «Модуль»</a>.</p>
      <p>Разработка — Илья Бельский.</p>
      <div class="version"></div>
    </footer>
  </section>



<!-- stats modal -->
<div class="modal fade" id="stats-modal" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
        <h4 class="modal-title">Ближайшие даты начала работ на участках</h4>
      </div>
      <div class="modal-body">
        <!--

        modal window content here

        -->
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default" data-dismiss="modal">Закрыть</button>
      </div>
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->



<div id="contextmenu">
  <ul class="dropdown-menu" role="menu">
  </ul>
</div>


<!--
    TEMPLATES
-->
<script type="text/template" id="contextmenu-comments-template">
  <li><a href="#" class="comment">Комментарии…</a></li>
  <li><a href="#" class="request-plan">Запрос подтвержедния планов…</a></li>
  <li><a href="#" class="confirm-plan">Подтверждение планов…</a></li>
</script>

<script type="text/template" id="contextmenu-nodes-template">
  <%var types = 'contract, order, work_type, workorder, work'.split(', ');
  var titles = "договоров, заказов, направлений работ, нарядов, работ".split(', ');%>
  <li class="dropdown-header">Раскрыть «<%= rootTitle %>»</li>
  <% for (var i = types.indexOf(rootType)+1; i < types.length; i++) {
    var type = types[i];
    var count = 0;
    D_datum.forEach(type, function() { count++; });%>
      <li><a href="#" data-type="<%= type %>">
        До <%= titles[i] %>
        <span class="nodes-inside"><%= count %></span>
      </a></li>
  <%}; %>
</script>


<script type="text/template" id="stats-template">
<table class="list">
  <tbody>
    <% _.each(stats, function(item) { %>
      <tr>
        <td class="label">
          <%= item.name %>
        </td>
        <td class="value">
          <% if (item.value) { %>
            <span class="delta">
              <% switch(item.delta) {
                case 0:%>
                сегодня<%
                  break;
                case 1:%>завтра<%
                  break;
                default:%>через <%
                  if (item.delta < 30) {%><%= pluralForm(item.delta, "день дня дней".split(' '), { neat: true }) %><%
                  } else {%><%= pluralForm(Math.round(item.delta / 30.41), "месяц месяца месяцев".split(' '), { neat: true }) %><%
                  }
                  break;
              } %>
            </span>
            <%= d3.time.format('%a, %e %b')(item.value) %>
          <% } else { %>
          свободен
          <% } %>
        </td>
      </tr>
    <% }); %>
  </tbody>
</table>
</script>


<script type="text/template" id="view-menu-template">
  <%
  var actions = {
    'false': 'Показать',
    'true': 'Скрыть'
  };
  var names = {
    'contract_level': 'уровень договоров',
    'plan_shifts': 'переносы дат',
    'statuses': 'отклонения',
    'comments': 'комментарии',
    'empty_contracts': 'договоры без планов',
    'facts': 'все факты',
    'facts_detalization': 'объёмы работ'
  };%>
  <% items.forEach(function(item) { %>
  <li class="<%= item.get('disabled') ? 'disabled' : '' %>">
    <a href="#toggle" data-item="<%= item.get('name') %>">
      <%= actions[item.get('visible')] %> <%= names[item.get('name')] %>
    </a>
  </li>
  <% }); %>
</script>


<script type="text/template" id="selector-menu-template">
  <% menuItems.forEach(function(item) { %>
    <% if (item.new_section) { %>
      <option data-divider="true"></option>
    <% } %>
    <option
      <% if (item.value) { %> value="<%= item.value %>" <% } %>
      <% if (item.subtext) { %> data-subtext="<%- item.subtext.trim() %>" <% } %>
      <%= item.selected ? 'selected' : '' %>
    ><%= item.name %></option>
  <% }); %>
</script>


<script type="text/template" id="user-menu-template">
  <li class="dropdown-header"><%= userId %></li>
  <li><a href="<%= window.location.pathname %>">Перезагрузить график</a></li>
  <li><a href="/menupage" target="_blank">
    Доступные страницы
    <i class="glyphicon glyphicon-new-window"></i>
  </a></li>
  <li class="divider"></li>
  <li><a href="/logout">Выход</a></li>
</script>
<!-- TOOLTIPS -->

<script type="text/template" id="tooltip-status-template">
<% if (info.last_status) { %>
  <%= info.last_status.reason %>
  <% if (info.last_status.reason_nodes && info.last_status.reason_nodes.length) { %>
    <span class="reason-nodes">
      <%=
        info.last_status.reason_nodes.map(function(node_path_tokens) {
          return '<span class="node">' + node_path_tokens.map(function(token) { return "<span>" + token + "</span>"; }).join('&nbsp;/&nbsp;') + '</span>';
        }).join(' ')%>
    </span>
  <% } %>
  <span class="description"><%= info.last_status.note %></span>
<% } else { %>
  <% switch(workStatus) {
    case 'on_hold':%> Суммарный простой <span class="description">простоев внутри: <%= info.inside %> </span> <%
    break;
    case 'on_work_with_reject':%> Суммарная работа с отклонением <span class="description">работ внутри: <%= info.inside %> </span> <%
    break;
    case 'on_pause':%> Суммарная приостановка <span class="description">приостановок внутри: <%= info.inside %> </span> <%
    break;} %>
<% } %>
</script>

<!-- COMMENTS -->

<script type="text/template" id="comments-widget-template">
<span class="button-close">&#xf00d;</span>
<div class="cell-date"> <span>&#xf073;</span> <%= d3.time.format('%A, %e %b.')(date) %> </div>
<!-- <h4> Комментарии </h4> -->
<%= cellsHtml %>
</script>


<script type="text/template" id="cells-add-comment-template">
  <ul class="cells-list">
    <li>
      <div class="title" data-cell-id="<%= cell.cell_id %>">
        <div class="path"><%= cell.cell_path %></div>
      </div>
      <% if(edit_type=='request_plan'){ %>
        <div class="req-plan" data-cell-id="<%= cell.cell_id %>">
          <span class="ttl">Запрос подтверждения планов</span><br>
          <div class="add-comment-input">
            <textarea rows="1" placeholder="Примечание (не обязательно)"></textarea>
            <span title="Отправить (Control + ⏎)" class="button-send-req glyphicon glyphicon-send" data-operation="request" data-cell-id="<%= cell.cell_id %>"></span>
          </div>
        </div>
      <% } else if(edit_type=='confirm_plan') { %>
        <div class="confirm-plan">
          <span class="ttl">Подтверждение планов</span><br>
          <div class="add-comment-input">
            <textarea rows="1" placeholder="Примечание (не обязательно)"></textarea>
            <span title="Отправить (Control + ⏎)" class="button-send-req glyphicon glyphicon-send" data-operation="confirm" data-cell-id="<%= cell.cell_id %>"></span>
          </div>
        </div>
        <% } else { %>
          <div class="comment-edit">
            <span class="ttl">Комментарий</span><br>
            <div class="add-comment-input">
              <textarea rows="1" placeholder="Комментарий к <%= cell.cell_id.slice(1, -11).split('/').slice(-2).join('/') || 'Договорам' %>..." />
              <span title="Отправить (Control + ⏎)" class="button-send glyphicon glyphicon-send"></span>
            </div>
          </div>
        <% } %>
      </div>
    </li>
  </ul>
</script>


<script type="text/template" id="cells-template">
<h4> Комментарии </h4>
<ul class="cells-list">
  <% cells.forEach(function(cell) { %>
    <% if(cell.commentsListHtml) { %>
      <li>
        <div class="title" data-cell-id="<%= cell.cell_id %>">
          <div class="path"><%= cell.cell_path %></div>
        </div>
        <% var dateFormat = function(date){
            var day = "";
            var today =  d3.time.day(new Date()),
              yesterday = d3.time.day.offset(today, -1);
            if (+date === +today) {
              day = "сегодня";
            } else if (+date === +yesterday) {
              day = "вчера";
            } else {
              day = d3.time.format('%A, %e %b.')(date);
            }
            return day+" в " + d3.time.format('%H:%M')(date);
          };%>
        <ul class="comments-list">
          <%= cell.commentsListHtml %>
        </ul>
      </li>
    <% } %>
  <% }) %>
</ul>
</script>


<script type="text/template" id="comments-list-template">
<% if (comments.length) {
  var newComments = false,
    today = d3.time.day(new Date()),
    yesterday = d3.time.day.offset(today, -1),
    timeFormat= d3.time.format('%H:%M'),
    dayFormat = function(date) {
      if (+date === +today) {
        return "сегодня";
      } else if (+date === +yesterday) {
        return "вчера";
      } else {
        return d3.time.format('%A, %e %b.')(date);
      }
    },
    commentDay, prevDay = 0;
  comments.forEach(function(comment, index) {
    // collect users to draw with different colors
    if (participants.indexOf(comment.user) === -1) {
      participants.push(comment.user);
    }
    // new comments flag
    if (newCommentIndex === index) {
      newComments = true;
    }
    // new day delimiter
    //
    commentDay = d3.time.day(comment.created_at || today);
    if (+commentDay !== +prevDay) {
      prevDay = commentDay; %>
      <li class="day-delimiter"> <hr> <span><%= dayFormat(commentDay) %></span> </li>
    <% } %>
    <li class="<%= comment.sending ? 'sending' : '' %> <%= newComments ? 'new-comment': '' %> <%= 'user-' + (participants.indexOf(comment.user) % 4) %>"
        data-created-at="<%= comment.created_at ? comment.created_at.toISOString() : "" %>">
      <% if (comment.created_at) { %>
        <span class="created_at"><%= timeFormat(comment.created_at) %></span>
      <% } %>
      <span class="user"><%= comment.user %></span>
      <% if(comment.type) { %>
        <span class="c-type"><%= (comment.type=='requestplan')?"Запрос подтверждения планов":"Подтверждение планов" %></span>
      <% } %>
      <span class="comment"><%= _.escape(comment.comment).replace(/\n/g, "<br/>") %></span>
    </li>
    <%
  });
} else { %>
  <li class="empty">Нет комментариев...</li>
<% } %>
</script>


<!-- INFO BLOCK WIDGETS -->

<script type="text/template" id="info-block-template">
<% if(selDate) {%>
  <div class="seldate-container">
    <span>Дата: <%= moment(selDate).format('DD.MM.YYYY') %></span>
    <span><%= moment(selDate).format('dddd').substring(0,1).toUpperCase()+moment(selDate).format('dddd').substring(1) %></span>
    <span><%= ($.inArray(moment(selDate).format('YYYY-MM-DD'), G.appView.model.get('weekends'))>=0)?'Выходной':'Рабочий день'  %></span>
    <span>До сегодня: <%= moment().startOf('day').diff(selDate,'days') %> дн.</span>
  </div>
<% } %>


<% if (nodeId) { %>
  <div class="path-container">
    <div class="path">
      <%= nodeId === '.' ? 'Договоры' : nodeId.split('/').slice(1).join('<span>/</span>') %>
    </div>
    <div class = "controls">
      <% if(nodeId!='.' && nodeId!="договоры"){%>
        <i class="fa fa-clock-o fa-lg i-notify <%=(obj.need_notification)?'active':''%>" title="Напоминание о наступлении планов"></i>
      <%}%>
    </div>
  </div>

  <div class="widgets-container"> </div>
<% } %>

<% if (dateRange.length) { %>
  <%var dateFormat = d3.time.format('%-e %b')%>
  <div class="date-range-info">
    <div class="range"><%= dateRange.map(dateFormat).join('.–') %>.</div>
    <% if (orderList.length) { %>
      <h4 class="header">Запланированные заказы</h4>
      <div class="btn-toolbar grouping">
        <span class='label btn btn-mini'>
          Группировка
        </span>
        <div class="btn-group">
        <% _.forEach({
            work_types: 'по направлению работ',
            sectors: 'по участкам'
          }, function(groupName, groupType) { %>
            <span class="<%= activeGrouping === groupType ? 'active' : '' %> btn btn-mini" data-type="<%= groupType %>"><%= groupName %></span>
        <% }); %>
        </div>
      </div>
    <% } else { %>
      <h4 class="header empty">Нет запланированных заказов</h4>
    <% } %>
    </h4>
    <dl>
      <% orderList.forEach(function(group) { %>
        <dt>
          <%= group.name.trim() %><% if (group.subname) { %>.
            <span class='group-subname'><%= group.subname %>.</span>
          <% } %>
        </dt>
        <dd>
        <% group.items.forEach(function(item) { %>
          <span class='node-link' data-path="<%= item.path %>">
            <%= item.name %><% if (item.subname) { %><span>/</span><%= item.subname %><% } %>
          </span>
        <% }); %>
        </dd>
      <% }); %>
    </dl>
  </div>
<% } %>
</script>



<script type="text/template" id="dates-widget-template">
<%var labels = { plan: "План", fact: "Факт", contract_plan: "Дог. план" },
  dateFormat = d3.time.format('%-e %b'),
  pretty = function(duration) {
    return pluralForm(duration, "день дня дней".split(' '));
  };%>
<% dateRanges.forEach(function(range) { %>
  <div class="<%= range.key %>">
    <%= labels[range.key] %>:
    <% if (range.dates) { %>
      <%= range.dates.map(dateFormat).join('.–') %>.
      <span class="duration" title="<%= labels[range.key] %>ы + Пустоты = Всего">
      <% if (range.unproductiveDays > 0) { %>
        <span class="productive"><%= range.productiveDays %></span> +
        <span class="unproductive"><%= range.unproductiveDays %></span> =
      <% } %>
      <%= pretty(range.duration) %></span>
    <% } else { %>
      нет данных
    <% } %>
  </div>
  <% if (range.key === 'plan' && worksWithPublishDates.length) { %>
    <% //var deltas = _.uniq(worksWithPublishDates.map(d3.ƒ('delta')));
      var deltas = worksWithPublishDates;%>
    <% if(range.dates.length){%>
        <%var tmp_dates_diff = moment.utc(range.dates[range.dates.length-1]).diff( moment.utc() ,'days' )%>
        <div class = "plan_finish"><span><nobr><%= (tmp_dates_diff>0)?pretty(tmp_dates_diff+1):pretty(tmp_dates_diff)%> до конца (не сч. сегодня).</nobr></span></div>
    <%}%>
    <div class="publish-date">
      Планы опубликованы за
      <span>
      <% if (deltas.length === 1) {
        print(pretty(deltas[0]));
      } else {
        print(_.min(deltas) + "–" + pretty(_.max(deltas)));
      } %>
      </span>
      до начала

    </div>
  <% } %>
<% }); %>
</script>


<script type="text/template" id="contract-dates-widget-template">
<%var labels = { plan: "План", fact: "Факт" },
  dateFormat = d3.time.format('%-e %b'),
  pretty = function(duration) {
    return pluralForm(duration, "день дня дней".split(' '));
  };%>
<h4 class="header">Даты по направлениям работ</h4>
<% workTypes.forEach(function(workType) { %>
  <dl <%= workType.name === 'troubleshooting' ? 'class="troubleshooting"' : ''%>>
    <% if (workType.name === 'troubleshooting') { %>
      <dt>Работы по устранению замечаний</dt>
    <% } else { %>
      <dt><%= workType.name %></dt>
    <% } %>
    <dd>
      <% workType.dateRanges.forEach(function(range) { %>
        <div class="<%= range.key %>">
          <%= labels[range.key] %>:
          <% if (range.dates) { %>
            <%= range.dates.map(dateFormat).join('.–') %>.
            <span class="duration" title="<%= labels[range.key] %>ы + Пустоты = Всего">
            <% if (range.unproductiveDays > 0) { %>
              <span class="productive"><%= range.productiveDays %></span> +
              <span class="unproductive"><%= range.unproductiveDays %></span> =
            <% } %>
            <%= pretty(range.duration) %></span>
          <% } else { %>
            нет данных
          <% } %>
        </div>
      <% }); %>
    </dd>
  </dl>
<% }); %>
</script>

<!-- ШАБЛОНЫ ОТОБРАЖЕНИЯ ВСЕХ ПЕРЕНОСОВ СРОКОВ ДЛЯ КОНКРЕТНОЙ РАБОТЫ!-->
<script type="text/template" id="plan-shift-all-data">
  <h4 class="header">Корректировка планов</h4>
  <span class = "lbl lbl-total-shifts" style = "padding: 1px 2px;"></span>
  <dl>
    <dd>
      <ul class = "data-body"></ul>
    </dd>
  </dl>
</script>

<script type="text/template" id="plan-shift-all-item">
  <li style = "margin-top:10px;">
    <% if(obj.type=='status') {%>
      <strong><%=date_str%> - Отклонение по факту</strong><br/>
      <span style="font-size: 11px"><%=window.ALL_USERS[user_email]%></span><br/>
      <%= (status=='on_hold')?'Простой':(status=='on_pause')?'Приостановка':(status=='on_work_with_reject')?'Работа с отклонением':'Не определено' %>
      начиная с <%= date_status_str %><br/>
      Причина: <%= obj.reason || '-' %><br/>
      Комментарий: <i><%= obj.note || '-' %></i>
    <% } else { %>
      <strong><%=date_str%> - <%=transfer_type%></strong><br/>
      <span style="font-size: 11px"><%=window.ALL_USERS[user_email]%></span><br/>
      Количество дней: <%=shift_days>0?'+'+shift_days:shift_days%>;<br/>
      <%=durations_note%><br/>
      <%=dates_note%><br/>
      Причина переноса: <%=reason%><br/>
      <%if(reason_nodes && reason_nodes.length>0){
        var reason_nodes_str = "";
        for(var rn_i in reason_nodes){
          var tmp_str = reason_nodes[rn_i].join('/');
          reason_nodes_str += '<a href = "http://int.modul.org/timeline/#sort=sort_by_date_finish/completed_filter=work/search='+tmp_str+'">'+tmp_str+'</a>, '
        }%>
        Уточнение причины: <%=reason_nodes_str.slice(0, -2)%><br/>
      <%}%>
      Комментарий: <i><%=note?'<br/>'+note:'-'%></i>
    <% } %>
  </li>
</script>


<!-- ШАБЛОНЫ ОТОБРАЖЕНИЯ ИНФОРМАЦИИ О ПЕРЕНОСАХ ДЛЯ ГРУПП!-->
<script type="text/template" id="plan-shift-all-data-group">
  <h4 class="header">Корректировка планов</h4>
  <dl>
    <dd>
      <ul class = "data-body">
        <li style = "margin-top:2px;">
          Всего: <%=all_count%>
          <% if(obj.all_statuses) {%>
            <br> Отклонений: <%= obj.all_statuses %>
          <% } %>
          <% if(last_date) { %>
            <br/>Последняя: <%= moment(last_date).format('DD.MM.YYYY') + ' - '+ window.ALL_USERS[user_email] %><br/>
          <% } %>
        </li>
      </ul>
    </dd>
  </dl>
</script>

<!-- ШАБЛОНЫ КОНТЕЙНЕРА ОТОБРАЖЕНИЯ ИНФОРМАЦИИ О ТРУДОВЫХ РЕСУРСАХ -->
<script type="text/template" id="settings-data-container">
  <h4 class="header">Ресурсы</h4>
  <dl>
    <dd>
      <ul class = "data-body"></ul>
    </dd>
  </dl>
</script>

<script type="text/template" id="settings-data">
  <li>
    Календарь: (<%=calendar.workday%>)x(<%=calendar.workweek%>)
  </li>
  <li>
    Трудовые ресурсы:&nbsp;<%=workers?workers.length:0%>
  </li>
  <li>
    <% if(workers){
      for(var i in workers){%>
        <%=workers[i]['user_fio']?workers[i]['user_fio']:'Не определен'%>
        <br>
    <%}}%>
  </li>
</script>


<!--**************************-->
<!--**************************-->
<!--**************************-->
<!--**************************-->
<script type="text/template" id="plan-shift-move-widget-template">
<h4 class="header"> Перенос без изменения длительности </h4>
<% var pretty = function(duration) {
    return pluralForm(duration, "день дня дней".split(' ')).replace('-', '–');
  };%>
<dl>
  <dd>
    <ul>
      <li>
        Последний: на <%= pretty(Math.abs(delta)) %>
        <%= delta > 0 ? "вперёд" : "назад" %>
      </li>
      <li>
        Причина:
        <% if (inside) { %>
          см. внутри (суммарный перенос, всего <%= inside %>)
        <% } else { %>
          <%= reason %> <% if (note) { %> (<%= note %>) <% } %>
          <% if (reason_nodes && reason_nodes.length) { %>
            <div class="reason-nodes">
              <%=
                reason_nodes.map(function(node_path_tokens) {
                  return '<span class="node">' + node_path_tokens.map(function(token) { return "<span>" + token + "</span>"; }).join('&nbsp;/&nbsp;') + '</span>';
                }).join(' ')%>
            </div>
          <% } %>
        <% } %>
      </li>
      <% if (total) { %>
      <li>
        Всего переносов по работе: <%= total %> (<span class = "lnk lnk-show-all-shift-moves">все переносы</span>)
      </li>
      <% } %>

      <% if (last_shift_date) { %>
      <li>
        Последний перенос был сделан <%= d3.time.format('%-e %b.')(new Date(last_shift_date)) %>
      </li>
      <% } %>
    </ul>
  </dd>
</dl>
</script>

<script type="text/template" id="plan-shift-resize-widget-template">
<%var labels = { start: "Начало", finish: "Окончание" },
  pretty = function(duration) {
    return pluralForm(duration, "день дня дней".split(' ')).replace('-', '–');
  },
  before = function(shift) {
    var format = "с";
    if (shift.before.getDate() === 2) { format += "о"; }
    format += " %-e";
    if (shift.before.getMonth() !== shift.after.getMonth()) { format += " %b."; }
    return d3.time.format(format)(shift.before);
  },
  after = function(shift) { return d3.time.format("на %-e %b.")(shift.after); }%>

<h4 class="header">
  <%= delta.start < delta.finish ? 'Увеличение' : 'Сокращение' %> длительности на <%= pretty(Math.abs(delta.finish - delta.start)) %>
</h4>

<dl>
  <dd>
    <% shifts.forEach(function(shift) { %>
      <ul>
        <li>
          <%= labels[shift.key] %>:
          <%= before(shift) %> <%= after(shift) %>
          <span class="duration">
            <%= (delta[shift.key] > 0 ? '+' : '') + pretty(delta[shift.key]) %>
          </span>
        </li>
        <li>
          Причина:
          <% if (shift.inside) { %>
            см. внутри (суммарный перенос, всего <%= shift.inside %>)
          <% } else { %>
            <%= shift.reason %> <% if (shift.note) { %> (<%= shift.note %>) <% } %>
            <% if (shift.reason_nodes && shift.reason_nodes.length) { %>
              <div class="reason-nodes">
                <%=shift.reason_nodes.map(function(node_path_tokens) {
                    return '<span class="node">' + node_path_tokens.map(function(token) { return "<span>" + token + "</span>"; }).join('&nbsp;/&nbsp;') + '</span>';
                  }).join(' ')%>
              </div>
            <% } %>
          <% } %>
        </li>
        <% if (shift.last_shift_date) { %>
          <li>
            <%= labels[shift.key] %> было перенесено <%= d3.time.format('%-e %b.')(new Date(shift.last_shift_date)) %>
          </li>
        <% } %>
      </ul>
    <% }); %>
    <% if (total) { %>
      <ul>
        <li>
          Всего переносов по работе: <%= total %> (<span class = "lnk lnk-show-all-shift-resizes">все переносы</span>)
        </li>
      </ul>
    <% } %>
  </dd>
</dl>
</script>
<!--**************************-->
<!--**************************-->
<!--**************************-->
<!--**************************-->

<script type="text/template" id="statuses-widget-template">
<h4 class="header">Отклонения</h4>
<dl>
  <dt>
    Всего:
    <%= totalStatuses.reduce(function(sum, status) { return sum + status.count; }, 0) %>
  </dt>
  <dd>
    <% var plurals = {
        'on_pause': "приостановка приостановки приостановок".split(' '),
        'on_hold': "простой простоя простоев".split(' '),
        'on_work_with_reject': "работе работам работам".split(' '),
        'no_data': "работе работам работам".split(' ')
    };%>
    <%= totalStatuses.map(function(status_) {
        var statInfo = "";
        if (status_.key === "no_data") {
          statInfo += "нет&nbsp;данных по&nbsp;";
        }
        statInfo += pluralForm(status_.count, plurals[status_.key]).replace(' ', '&nbsp;');
        return statInfo;
        }).join(', ')%>
  </dd>
  <% if (date && byDateStatuses.length) { %>
    <dt>
      На <%= d3.time.format('%-e %b')(date) %>.
    </dt>
    <dd class="statuses-container"></dd>
  <% }%>
</dl>
</script>

<script type="text/template" id="statuses-nodata-widget-template">
<div>
  <% if (info.inside) { %>
    Нет данных по <%= pluralForm(info.inside, "работе работам работам".split(' ')) %>
  <% } else { %>
    Нет данных по этой работе
  <% } %>
  с <%= d3.time.format('%-e %b')(info.from_date) %>.
</div>
</script>

<script type="text/template" id="statuses-onhold-onpause-widget-template">
<% var labels = {
  'on_hold': ['Простой', 'Простоев'][info.inside ? 1 : 0],
  'on_work_with_reject': ['Работа с отклонением', 'Работ с отклонением'][info.inside ? 1 : 0],
  'on_pause': ['Приостановка', 'Приостановок'][info.inside ? 1 : 0]
  };%>
<div>
  <%= labels[key] %>:
  <% if (info.inside) { %>
    <%= info.inside %>
  <% } else { %>
    <%= info.last_status.reason %>
    <% if (info.last_status.reason_nodes && info.last_status.reason_nodes.length) { %>
      <div class="reason-nodes">
        <%=info.last_status.reason_nodes.map(function(node_path_tokens) {
            return '<span class="node">' + node_path_tokens.map(function(token) { return "<span>" + token + "</span>"; }).join('&nbsp;/&nbsp;') + '</span>';
          }).join(' ')%>
      </div>
    <% } %>
    <span class="description"><%= info.last_status.note %></span>
  <% } %>
</div>
</script>


<script type="text/template" id="materials-widget-template">
<h4 class="header">Группы материалов</h4>

<% if (materials) { %>
  <ul class="list">
    <% materials.forEach(function(material) { %>
      <li><%= material.name %></li>
    <% }); %>
    <% if (materials.length === 0) { %>
      <li class="empty">Пусто...</li>
    <% } %>
  </ul>
<% } else { %>
  <div class="loading">Загрузка...</div>
<% } %>
</script>


<script type="text/template" id="teamleads-widget-template">
<h4 class="header">Исполнители</h4>
<ul class="list">
  <% teamleads.forEach(function(item) { %>
    <li><%= item %></li>
  <% }); %>
  <% if (teamleads.length === 0) { %>
    <li class="empty">Пусто...</li>
  <% } %>
</ul>
</script>


</body>
</html>
