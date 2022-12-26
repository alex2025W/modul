%def scripts():
  <link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
  <script src="/static/scripts/select2.js?v={{version}}"></script>
  <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
  <link rel="stylesheet" href="/static/css/selectize.bootstrap2.css?v={{version}}">
  <!---->
  <link href="/frontend/crm_projects/styles/projects.css?v={{version}}" rel="stylesheet" media="screen, print">
  <script src="/frontend/crm_projects/scripts/app.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='CRM. Проекты заказчика', current_user=current_user, version=version, scripts=scripts,menu=menu

<div id="projectContainer">
  <div class="row hidden-print">
    <div class="span12">
      <div class="navbar">
        <div id="pnlProjectFilter" class="navbar-inner" style="padding-top:10px">
          <div class="input-prepend input-append" style="float:left; margin-right: 10px;">
            <span class="add-on"><b class="icon-list-alt"></b></span>
            <input type="text" class="filter-number" id="tbProjectName" placeholder="поиск проекта">
            <button id="btnProjectFind" class="btn btn-primary btn-filter">Искать</button>
          </div>
          <button type="button" id="btnShowAll" class="btn btn-primary" style="margin-top: 0;">Показать все</button>
          <button type="button" id="btnNewProject" class="btn btn-primary" style="margin-top:0;">Новый проект</button>
        </div>
      </div>
    </div>
  </div>
  <div class="project-edit" id="projectEditPnl">
  </div>
</div>

<script type="text/template" id="projectViewTemplate">
  <div class="form-horizontal project-view" style="margin-top:40px;">
    <div class="row">
      <div class="control-group">
        <label class="control-label">Название проекта:</label>
        <div class="controls">
          <div class="span9" style="position:relative;">
          <a href="crm#orders/&managers=0&cl=all&o=all&c=total&m=&t=all&r=all&od=all&oed=all&cd=all&fd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off&project=<%= obj['_id'] %>" target="_blank"><%= project_name.replace(/\"/g, '&quot;') %></a>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Количество персонала:</label>
        <div class="controls">
          <div class="span9">
            от <span class="value"><%= project_personal_from %></span> до <span class="value"><%= project_personal_to %></span>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Дата начала:</label>
        <div class="controls">
          <div class="span9">
            <span class="value"><%= project_start %></span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Дата окончания:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="value"><%= project_finish %></span>
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Длительность, мес:&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span class="value"><%=  (project_start && project_finish)?Math.ceil(moment(Routine.parseDate(project_finish,'dd.mm.yyyy')).diff(Routine.parseDate(project_start,'dd.mm.yyyy'),'month')):0 %></span>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Краткое описание:</label>
        <div class="controls">
          <div class="span9">
            <%= project_note.replace(/\n/g, '<br>') %>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Связанные заявки:</label>
        <div class="controls">
          <div class="span9" style="position:relative;">
          <%= linked_orders.map(function(item){
             return '<a href="/crm/'+item+'" target="_blank">'+item+'</a>';
           }).join("; ") %>
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Клиенты:</label>
        <div class="controls">
          <div class="span9 client-list-container" style="position:relative;">
            <%= clients.map(function(item){
              return '<a href="/client-card/'+item.id+'" target="_blank">'+item.name+"</a>"
            }).join("; ") %>
          </div>
        </div>
      </div>
    </div>
     <div class="save-btn-container text-right row" style="margin-top:20px;">
      <a class="btn btn-info edit-full-data">Редактировать</a>
    </div>
  </div>
</script>

<script type="text/template" id="projectEditTemplate">
  <div class="form-horizontal customer-project-block" style="margin-top:40px;">
    <div class="row">
      <div class="control-group span12">
        Для чего заказчику нужна наша продукция? Обычно, для строительства чего-либо. Вот это «что-либо» и есть Проект заказчика. <strong>Запрещается</strong> писать, типа: «Для размещения рабочих». Никто просто так рабочих не размещает. Рабочих замещают для «чего-либо».<br/><em style="font-size:inherit;">Например, Строительство стадиона  — это и есть <strong>«Название проекта»</strong>. Любое название (в том числе и это) обычно состоит из 1-3 слов. Не надо писать в название проекта длинные предложения!<br/>На строительстве стадиона будет задействовано около 100 человек — это <strong>«Количество персонала»</strong>.<br/>Строительство стадиона начнётся примерно 12 ноября 2015 года и закончится 12 ноября 2018 года — это <strong>«Дата начала»</strong> и <strong>«Дата окончания»</strong>.</em><br/><strong>Все цифры и даты ориентировочные!</strong>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Название проекта:</label>
        <div class="controls">
          <div class="span9" style="position:relative;">
          <input type="text" class="project-name" placeholder="Название проекта" style="width:100%;" value="<%= project_name.replace(/\"/g, '&quot;') %>" />
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Связанные заявки:</label>
        <div class="controls">
          <div class="span9" style="position:relative;">
          <input type="text" class="same-order-list" />
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div class="control-group">
        <label class="control-label">Клиенты:</label>
        <div class="controls">
          <div class="span9 client-list-container" style="position:relative;">
            <input type="text" class="clients-list" placeholder="Клиенты" style="width:100%;"  />
          </div>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Количество персонала:</label>
        <div class="controls">
          от <input type="text" class="project-personal-from" placeholder="От" style="width:80px;" value="<%= project_personal_from %>" />&nbsp;&nbsp;&nbsp;до&nbsp;&nbsp;&nbsp;<input type="text" placeholder="До"  class="project-personal-to"  value="<%= project_personal_to %>" style="width:80px;" />
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Дата начала:</label>
        <div class="controls">
          <input type="text"  class="project-date-start"  value="<%= project_start %>" placeholder="Начало" />&nbsp;&nbsp;&nbsp;Дата окончания:&nbsp;&nbsp;&nbsp;<input type="text" class="project-date-finish" placeholder="Окончание" value="<%= project_finish %>" />&nbsp;&nbsp;&nbsp;Длительность, мес:&nbsp;&nbsp;&nbsp;<span class="project-date-length"></span>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="control-group">
        <label class="control-label">Краткое описание:</label>
        <textarea style="width:94%;margin-left: 34px; height:200px;" class="project-note"><%= project_note %></textarea>
      </div>
    </div>
     <div class="save-btn-container text-right row" style="margin-top:20px;">
      <a class="btn btn-info save-full-data">Сохранить</a>
      <% if(obj['_id']) { %>
      <a class="btn btn-info close-full-data">Отменить</a>
    <% } %>
    </div>
  </div>
</script>

<script type="text/template" id="projectListTemplate">
  <div class="form-horizontal customer-project-block" style="margin-top:40px;">
    <% if(projects.length>0){ %>
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Название проекта</th><th>Персонал от/до</th><th>Дата начала/окончания</th>
          </tr>
        </thead>
        <tbody>
          <% for(var i in projects) {%>
            <% var pr = projects[i]; %>
            <tr>
              <td><a href="#search/<%= pr['_id']%>"><%= pr.project_name %></a></td><td><%= (pr.project_personal_from=="")?"-":pr.project_personal_from %> / <%= (pr.project_personal_to=="")?"-":pr.project_personal_to %></td><td><%= (pr.project_start)?pr.project_start:"-" %> / <%= (pr.project_finish)?pr.project_finish:"-" %></td></tr>
            </tr>
          <% } %>
        </tbody>
        <% if(pages>1) {%>
          <tfooter>
            <tr><td colspan="3"><div class="pager">
              <% var start = cur_page-5;
                 if (start<1) start = 1;
                 var end = start+10;
                 if(end>pages)
                  end = pages;%>
                <% if(start>1) { %><span class="over">...</span><% } %>
                <% for(var i=start;i<=end;++i) {%>
                <% if(i==cur_page) {%>
                  <span class="cur"><%= i %></span>
                <% } else {%>
                  <a href="#list/<%= i %>" data-page="<%= i %>"><%=i %></a>
                <% } %>
                <%}%>
                <% if(end<pages) { %><span class="over">...</span><% } %>
          </tfooter>
        <% } %>
      </table>
    <% } else { %>
      <span class="empty-list">Ничего не найдено</span>
    <% } %>
  </div>
</script>
