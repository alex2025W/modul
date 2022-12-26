%import json
%def scripts():
<link href="/static/css/backbone.upload-manager.css?v={{version}}" rel="stylesheet" />
<!---->
<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
<script src="/static/scripts/libs/backbone.defered-view-loader.js?v={{version}}"></script>
<script src="/static/scripts/user_controls/file_uploader/jquery.ui.widget.js?v={{version}}"></script>
<script src="/static/scripts/user_controls/file_uploader/jquery.iframe-transport.js?v={{version}}"></script>
<script src="/static/scripts/user_controls/file_uploader/jquery.fileupload.js?v={{version}}"></script>
<script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
<script src="/static/scripts/user_controls/file_uploader/backbone.google-upload-manager.js?v={{version}}"></script>
<script src="/static/scripts/libs/google_upload.js?v={{version}}"></script>
<!---->
<link href="/frontend/project_documentation/styles/documentation.css?v={{version}}" rel="stylesheet" media="screen">
<script src="frontend/project_documentation/scripts/models.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/collections.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/router.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/documents_list_views.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/add_form_view.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/filter_panel_view.js?v={{version}}"></script>
<script src="frontend/project_documentation/scripts/app.js?v={{version}}"></script>
<!---->
<script>
  App.models['sectors'] ={{!sectors}};
  App.models['orders'] ={{!orders}};
  App.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
  App.GOOGLE_API_CONFIG = {{!google_api_config}};

  /**
   * All scripts loaded
   */
  $(function() {
    App.initialize();
    Backbone.TemplateManager.baseUrl = '{name}';
    $.getScript('https://apis.google.com/js/client.js?onload=checkAuth', function() { console.log('google api loaded') });
  });

  /**
   * Check if current user has authorized this application.
   */
  function checkAuth() {
    gapi.auth.authorize(
      {
        'client_id': App.GOOGLE_API_CONFIG.client_id,
        'scope': App.GOOGLE_API_CONFIG.scope,
        'immediate': true
      }, handleAuthResult);
  }
  /**
   * Handle response from authorization server.
   * @param {Object} authResult Authorization result.
   */
  function handleAuthResult(authResult) {
    if (authResult && !authResult.error)
    {
      // remember token id
      App.GOOGLE_API_CONFIG.token_id = authResult.access_token;
    }
    else
      $.jGrowl('Ошибка авторизации. Вам необходимо выполнить повторную авторизацию в системе.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
  }
</script>
%end

%rebase master_page/base page_title='Проектная документация', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--INCLUDE ALL TEMPLATES-->
%include frontend/project_documentation/templates/document_add
%include frontend/project_documentation/templates/document_list

<div  id="documentation-container">
  <div class = "row hidden-print">
    <div  class="span12">
      <div class="navbar-inner" id="documentation-filters">
        <div class='pnl-ddl input-append pnl-ddl-filter-orders' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-filter-orders" multiple="multiple"></select>
        </div>
        <div class='pnl-ddl input-append pnl-ddl-filter-section' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-filter-section" multiple="multiple"></select>
        </div>
        <div class='pnl-ddl input-append pnl-ddl-filter-stage' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-filter-stage">
            <option value="">Выбрать стадию</option>
            <option value="П">Стадия: П</option>
            <option value="Р">Стадия: Р</option>
          </select>
        </div>
        <div class='pnl-ddl input-append pnl-ddl-filter-isagreed' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-filter-isagreed">
            <option value="">Согласовано с заказчником</option>
            <option value="yes">Согласовано: Да</option>
            <option value="no">Согласовано: Нет</option>
          </select>
        </div>
        <button class="btn btn-primary btn-filter" id="btn-show">Показать</button>
        <button class="btn btn-default add-new-document" style="float:right;"><i class="icon-plus"></i>&nbsp;&nbsp;Добавить</button>
        <div class="form-inline" style="margin-bottom:5px;">
          <label class="checkbox"><input type="checkbox" checked="checked" class="ch-filter-last-redaction" />Последние редакции</inut>&nbsp;&nbsp;
          <label class="checkbox"><input type="checkbox" class="ch-filter-group-sections" />Группировать по разделам</inut>
        </div>
      </div>
    </div>
  </div>
  <div class="row">
    <div id="documentation-list" class="span12"></div>
  </div>
</div>
