%def scripts():
  <link href="/static/css/backgrid.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/backgrid-filter.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/backgrid-paginator.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/role.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/backgrid.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backgrid-filter.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backbone-pageable.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backgrid-paginator.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/userlib.js?v={{version}}"></script>
  <script src="/static/scripts/role.js?v={{version}}"></script>
%end
%rebase master_page/base page_title='Роли пользователей.', current_user=current_user, version=version, scripts=scripts, menu=menu

<script type="text/javascript">
  var global_user_list = {{! users }};
  var global_page_list = {{! pages }};
</script>
  <style>
  .backgrid td{
    white-space: normal !important;
  }
  #roles-grid table.backgrid th:first-child,#roles-grid table.backgrid td:first-child{
      min-width:200px !important;
      max-width:200px !important;
      width: 200px !important;
    }
    #roles-grid table.backgrid th:last-child,#roles-grid table.backgrid td:last-child{
        font-size: 12px;
      }
  </style>

<script id="additionl_template_app" type="text/template">
  <fieldset>
    <legend>Доступ к клиентам и заявкам</legend>
    <label class="checkbox" style="display:block;"><input type="checkbox" name="crm-pending" data-type="all" <%= (obj && obj['pending'])?'checked':'' %> />В ожидании</label>
    <label class="checkbox" style="display:block; margin-bottom:10px"><input type="checkbox" name="crm-failures" data-type="all" <%= (obj && obj['failures'])?'checked':'' %> />Отказы</label>
    <form>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="all" <%= (!obj || !obj['type'] || obj['type']=='all')?'checked="checked"':'' %> />Все клиенты и заявки</label>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="onlymy" <%= (obj && obj['type']=='onlymy')?'checked="checked"':'' %> />Только свои</label>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="shared" <%= (obj && obj['type']=='shared')?'checked="checked"':'' %> />Клиенты и заявки указанных менеджеров</label>
    </form>
    <div class="manager-list-bl" style="border-top:solid 1px #ccc; margin-top:10px;padding-top:10px; width:100%;">
      <div class="filter" style="width:100%;"><b>Менеджеры</b><input type="text" class="crm-o-man-filter" style="float:right;" <%= (!obj || obj['type']!='shared')?'disabled':'' %> /></div>
      <div class="manager-list" style="max-height:300px; overflow-y:auto; width:100%;">
        <% for(var i in global_user_list) {%>
          <% var us = global_user_list[i];
             if(us['admin']=='manager'){ %>
              <div class="mnlist-user" style="display:block;padding:2px 0;"><label class="checkbox"><input type="checkbox" data-email="<%= us['email'] %>" <%= (obj && obj['managers'] && obj['managers'].indexOf(us['email'])>=0)?'checked':'' %> <%= (!obj || obj['type']!='shared')?'disabled':'' %> />&nbsp;<%= (us['fio']?us['fio']:'-')+' ('+us['email']+')' %></label></div>
        <% }} %>
      </div>
    </div>
  </fieldset>
</script>

<script id="additionl_template_contracts" type="text/template">
  <fieldset>
    <legend>Доступ к договорам</legend>
    <form>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="all" <%= (!obj || !obj['type'] || obj['type']=='all')?'checked="checked"':'' %> />Все договоры</label>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="onlymy" <%= (obj && obj['type']=='onlymy')?'checked="checked"':'' %> />Только свои</label>
    <label class="radio" style="display:block;"><input type="radio" name="crm-o-man" data-type="shared" <%= (obj && obj['type']=='shared')?'checked="checked"':'' %> />Договоры указанных менеджеров</label>
    </form>
    <div class="manager-list-bl" style="border-top:solid 1px #ccc; margin-top:10px;padding-top:10px; width:100%;">
      <div class="filter" style="width:100%;"><b>Менеджеры</b><input type="text" class="crm-o-man-filter" style="float:right;" <%= (!obj || obj['type']!='shared')?'disabled':'' %> /></div>
      <div class="manager-list" style="max-height:300px; overflow-y:auto; width:100%;">
        <% for(var i in global_user_list) {%>
          <% var us = global_user_list[i];
             if(us['admin']=='manager'){ %>
              <div class="mnlist-user" style="display:block;padding:2px 0;"><label class="checkbox"><input type="checkbox" data-email="<%= us['email'] %>" <%= (obj && obj['managers'] && obj['managers'].indexOf(us['email'])>=0)?'checked':'' %> <%= (!obj || obj['type']!='shared')?'disabled':'' %> />&nbsp;<%= (us['fio']?us['fio']:'-')+' ('+us['email']+')' %></label></div>
        <% }} %>
      </div>
    </div>
  </fieldset>
</script>

<script id="additionl_template_workorderdate" type="text/template">
  <fieldset>
    <legend>Доступ к нарядам</legend>
    <label class="checkbox" style="display:block;"><input type="checkbox" name="wo-past_dates" data-type="all" <%= (obj && obj['past_dates'])?'checked':'' %> />Ввод дат в прошлом</label>
    <label class="checkbox" style="display:block; margin-bottom:10px"><input type="checkbox" name="wo-cancel_transfer" data-type="all" <%= (obj && obj['cancel_transfer'])?'checked':'' %> />Отмена корректировок</label>
  </fieldset>
</script>

<script id="pagesGrid" type="text/template">
  <div class="page-grid">
    <div class="row header">
      <span class="span6"><a href="javascript:;" class="sort-title">Название</a></span>
      <span class="span2 text-center">Чтение</span>
      <span class="span2 text-center">Запись</span>
      <span class="span2 text-center">Расширения</span>
    </div>
    <% for(var i in obj) {%>
      <div class="row role-elem" data-id="<%= obj[i]['id'] %>">
        <span class="span6"><%= obj[i]['title'] %></span>
        <span class="span2 text-center"><input type="checkbox" class="access_r" <%=obj[i]['access_r']?'checked':'' %> /></span>
        <span class="span2 text-center"><input type="checkbox" class="access_w" <%=obj[i]['access_w']?'checked':'' %> /></span>
        <span class="span2 text-center"><input type="checkbox" class="access_o" <%=obj[i]['access_o']?'checked':'' %> /></span>
        <% if(obj[i]['has_additional']) { %>
          <div class="additional offset6 span6" <%=obj[i]['access_o']?'':'style="display:none;"' %>>
            <%= _.template($('#additionl_template_'+obj[i]['id']).html())(obj[i].additional?obj[i].additional:{}) %>
          </div>
        <% } %>
      </div>
    <% } %>
  </div>
</script>

<script id="roleEditTemplate" type="text/template">
  <form class="edit-role-form  form-inline">
    <fieldset>
      <div class="control-group">
          <label class="control-label" for="role-title">Название роли:</label>
          <div class="controls">
              <input type="text" id="role-title" placeholder="Название роли" value="<%= title %>" />
          </div>
        </div>
    </fieldset>
    <fieldset>
      <legend>Страницы</legend>
      <div class="pages-list">

      </div>
    </fieldset>
    <div class="edit-footer">
      <a href="javascript:;" class="btn btn-success save-role">Сохранить</a>
      <% if(id){ %>
        <a href="javascript:;" class="btn btn-danger delete-role">Удалить</a>
      <% } %>
      <a href="javascript:;" class="btn close-role">Отменить</a>
    </div>
    <fieldset>
      <legend>Пользователи</legend>
      <div class="users-list">

      </div>
    </fieldset>
    <div class="edit-footer">
      <a href="javascript:;" class="btn btn-success save-role">Сохранить</a>
      <% if(id){ %>
        <a href="javascript:;" class="btn btn-danger delete-role">Удалить</a>
      <% } %>
      <a href="javascript:;" class="btn close-role">Отменить</a>
    </div>
  </form>
</script>

<!--Основная форма-->
<div id="role-edit" style="display:none;"></div>
<div id="roles-grid" style="display:none;">
  <div class="roles-header">
    <div class="rl-left">
    </div>
    <div class="rl-right">
      <a href="javascript:;" class="btn btn-success btn-large" id="newRole"><i class="icon-white icon-plus"></i> Добавить роль</a>
    </div>
  </div>
</div>
