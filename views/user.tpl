
%def scripts():
  <link href="/static/css/backgrid.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/backgrid-filter.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/backgrid-paginator.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">

  <script src="/static/scripts/libs/backgrid.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backgrid-filter.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backbone-pageable.min.js?v={{version}}"></script>

  <script src="/static/scripts/libs/backgrid-paginator.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/userlib.js?v={{version}}"></script>

  <script src="/static/scripts/user.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Пользователи', current_user=current_user, version=version, scripts=scripts,menu=menu


<script type="text/javascript">
  var global_role_list = {{! roles }};
  var global_page_list = {{! pages }};
</script>

<script id="userEditTemplate" type="text/template">
  <form class="edit-role-form  form-inline">
    <fieldset>
      <div class="control-group">
        <label class="control-label" for="user-fio">Фамилия Имя Отчество:</label>
        <div class="controls">
            <input type="text" id="user-fio" placeholder="Фамилия Имя Отчество" autocomplete="off" value="<%= fio %>" />
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-table">Табельный номер:</label>
        <div class="controls">
            <input type="text" id="user-table" placeholder="Табельный номер" autocomplete="off" value="<%= table %>" />
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-default-page">Страница по умолчанию:</label>
        <div class="controls">
            <select id="user-default-page">
              <option value="">Выберите страницу</option>
              <% for(var p in global_page_list){ %>
                <option value="<%= global_page_list[p].id %>" <%= (defaultpage==global_page_list[p].id)?"selected":"" %>><%=global_page_list[p].title %></option>
              <% } %>
            </select>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-email">Email:</label>
        <div class="controls">
            <input type="text" id="user-email" placeholder="Email"  autocomplete="off" value="<%= email %>" <%= id?'disabled="disabled"':'' %> />
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-inner-phone">Внутренний номер :</label>
        <div class="controls">
            <input type="text" id="user-inner-phone" placeholder="Телефон"  autocomplete="off" value="<%= inner_phone %>"  />
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-password">Пароль:</label>
        <div class="controls">
            <input type="password" id="user-password" autocomplete="off" placeholder="Пароль" />
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" for="user-repassword">Повторить пароль:</label>
        <div class="controls">
            <input type="password" id="user-repassword" autocomplete="off" placeholder="Повторить пароль" />
        </div>
      </div>
      <div class="control-group check-group">
        <div class="controls">
          <input type="checkbox" id="user-isadmin" <%= (admin=='admin')?'checked="checked"':"" %> /><label class="control-label" for="user-isadmin">Супер-администратор</label>
        </div>
        <div class="controls">
          <input type="checkbox" id="user-isblock" <%= (stat!='enabled')?'checked="checked"':"" %> /><label class="control-label" for="user-isblock">Заблокирован</label>
        </div>
      </div>
    </fieldset>
    <fieldset>
      <legend>Роли</legend>
      <div class="roles-list">

      </div>
    </fieldset>
    <div class="edit-footer">
      <a href="javascript:;" class="btn btn-success save-role">Сохранить</a>
      <a href="javascript:;" class="btn close-role">Отменить</a>
    </div>
  </form>
</script>

<div id="user-edit" style="display:none;">
</div>


<div id="user-list" style="display:none;">
	<div class="users-header">
    	<div class="rl-left">
    	</div>
    	<div class="rl-right">
      	<a href="javascript:;" class="btn btn-success btn-large" id="newUser"><i class="icon-white icon-plus"></i> Добавить пользователя</a>
    	</div>
  	</div>
</div>
