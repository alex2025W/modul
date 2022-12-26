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
  <link href="/frontend/crm_google_catalogs_rights/styles/index.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/crm_google_catalogs_rights/scripts/app.js?v={{version}}"></script>
  <script>$(function() {
    bootbox.setDefaults({locale: "ru"});
    App.initialize();
    });
  </script>

%end
%rebase master_page/base page_title='CRM. Раздача прав на каталоги заявок', current_user=current_user, version=version, scripts=scripts,menu=menu

<!-- Шаблон отображения истории выполнения -->
<script id="DataHistoryListTemplate" type="text/template">
  <div class = "line">
    <table class="in-info data-history" style = "margin-top:10px; margin-bottom: 30px;">
      <thead>
        <tr>
          <td style = "width:10%;">Заявка</td>
          <td style = "width:30%" >Каталог</td>
          <td style = "width:20%;">Пользователь</td>
          <td style = "width:40%">Результат</td>
        </tr>
      </thead>
      <tbody class = "data-body"></tbody>
    </table>
  </div>
</script>

<!-- Шаблон отображения конкретного элемента истории -->
<script id="DataHistoryItemTemplate" type="text/template">
  <td class = "<%=status=='error'?'red':'' %>"><%=order_number%></td>
  <td class = "<%=status=='error'?'red':'' %>"><%=path%></td>
  <td class = "<%=status=='error'?'red':'' %>"><%=user_email%></td>
  <td class = "<%=status=='error'?'red':'' %>"><%=note%></td>
</script>

<!-- MAIN FORM -->
<div class="container" id = "CrmGoogleCatalogsRights">
  <div class="row" style = "margin-top: 20px;">
    <form class="form-horizontal mainForm">
      <fieldset><legend>Заполните форму</legend>
        <div class="form-group">
          <label class="control-label col-sm-2" for="input">Номера заявок:</label>
          <div class="col-sm-6">
              <input type="text" class="form-control tb tb-order-numbers" value="" placeholder="6912; 6913">
          </div>
        </div>
        <div class="form-group">
          <label class="control-label col-sm-2" for="input">Каталоги:</label>
          <div class="col-sm-6">
              <input type="text" class="form-control tb tb-catalogs" value="" placeholder="ТЗ/Тип 7; ТЗ/Тип 6">
          </div>
        </div>
        <div class="form-group">
          <label class="control-label col-sm-2" for="input">Пользователи:</label>
          <div class="col-sm-6">
              <input type="text" class="form-control tb tb-users" value="" placeholder="rm@modul.or, ma@modul.org">
          </div>
        </div>
        <div class="form-group">
          <label class="control-label col-sm-2" for="input">Доступ:</label>
          <div class="col-sm-6">
            <div class="checkbox">
              <select class="ddl-access">
                <option value="">Выберите тип доступа</option>
                <option value="close">Закрыть доступ</option>
                <option value="read">Только чтение</option>
                <option value="write">Полный доступ</option>
              </select>
            </div>
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
