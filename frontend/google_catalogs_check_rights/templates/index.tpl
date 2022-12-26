%def scripts():
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/user_controls/queue.js?v={{version}}"></script>
  <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/google_catalogs_check_rights/styles/index.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/google_catalogs_check_rights/scripts/app.js?v={{version}}"></script>
  <script>$(function() {
    bootbox.setDefaults({locale: "ru"});
    App.initialize();
    });
  </script>

%end
%rebase master_page/base page_title='CRM. Проверка на общий доступ каталогов заявок', current_user=current_user, version=version, scripts=scripts,menu=menu

<!-- Шаблон отображения истории выполнения -->
<script id="DataHistoryListTemplate" type="text/template">
  <div class = "line">
    <table class="in-info data-history" style = "margin-top:10px; margin-bottom: 30px;">
      <thead>
        <tr>
          <td style = "width:30%;">ID</td>
          <td style = "width:70%" >Каталог</td>
        </tr>
      </thead>
      <tbody class = "data-body"></tbody>
    </table>
  </div>
</script>

<!-- Шаблон отображения конкретного элемента истории -->
<script id="DataHistoryItemTemplate" type="text/template">
  <td class = "<%=status=='error'?'red':'' %>"><a class = "lnk" href = "https://drive.google.com/drive/folders/<%=id%>"> <%=id%></a></td>
  <td class = "<%=status=='error'?'red':'' %>"><%=name%></td>
</script>

<!-- MAIN FORM -->
<div class="container" id = "CrmGoogleCatalogsRights">
  <div class="row" style = "margin-top: 20px;">
    <form class="form-horizontal mainForm">
      <fieldset><legend>Заполните форму</legend>
        <div class="form-group">
          <label class="control-label col-sm-2" for="input">ID каталога:</label>
          <div class="col-sm-6">
              <input type="text" class="form-control tb tb-folder-id" value="" placeholder="0B1AR7RNHp1qBbXJZOEp1QXRDSDA">
          </div>
        </div>
        <div class="form-group">
          <div class="col-sm-10 col-sm-offset-2">
            <div class="pull-right">
              <button type="submit" class="btn btn-primary btn-save">Выполнить</button>
            </div>
          </div>
        </div>
      </fieldset>
    </form>
  </div>
  <div class="row data-result-report">
  </div>
</div>
