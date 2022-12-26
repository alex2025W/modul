%def scripts():
  <!--styles-->
  <link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
  <!--scripts-->
 <script src="/static/scripts/select2.js?v={{version}}"></script>
 <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
 <script src="/static/scripts/clientlist.js?v={{version}}"></script>
 <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
%end
%rebase master_page/base page_title='CRM. Клиенты', current_user=current_user, version=version, scripts=scripts, menu=menu
<style>
.hidden{
  display: none;
}
.text-right{
  text-align: right !important;
}
.label a{
  text-decoration: none;
  color: #fff;
}
.fa{
  text-decoration: none;
  color: #000;
}
.fa:hover{
  text-decoration: none;
  color: #000;
}
.group-name{
  width:150px;
}
.bootbox-confirm.modal{
  width:450px;
  margin-left:-175px;
  z-index: 2000;
}
.table tbody tr:hover td, .table tbody tr:hover th {
    background-color: #FEF8B5;
}
</style>

<script id="client-item-template" type="text/template">
        <td
          <a href="javascript:;" class="edit-data" ><%= name %></a>
        </td>
        <td>
        <%= cl=='notcl'?'':'Ч-Л' %>
        </td>
        <td class="text-right">
          <a href="javascript:;" class="btn btn-mini add-group <%= group !=''?'hidden':'' %>">Добавить&nbsp;в&nbsp;группу</a>
          <div class="group-name-block hidden">
            <input type="text" value="<%= group %>" class="group-name" />
          </div>
          <div class="group-current-block <%= group ==''?'hidden':'' %>">
            <span class="label">
              <a href="javascript:;" class="current-group"><%= group %></a>&nbsp;&nbsp;<a href="javascript:;" class="del-group">&times;</a>
            </span>
            <a href="javascript:;" class="fa fa-star<%= base_group=='yes'?'':'-o' %>"></a>
          </div>
        </td>
</script>

<div id="client-list">
  <div>
    <div class="filter">
    <label>Чл/компания:&nbsp;
      <select style="width:200px;" class="client-type">
        <option selected value="notcl">Компания</option>
        <option value="cl">Частное лицо</option>
        <option value="">Все</option>
      </select>
      </label>
    </div>
    <table class="table table-striped table-hover">
      <thead>
          <tr>
            <th><strong>Название</strong></th>
            <th><strong>Ч-Л</strong></th>
            <th><strong></strong></th>
          </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>
</div>
  <div id="clientModal" class="modal hide" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-body first">
    <div class="control-group">
    <label class="control-label" for="client-name">Имя</label>
    <div class="controls">
      <input type="text" id="client-name" placeholder="Имя">
    </div>
  </div>
   <div class="control-group">
    <label class="control-label" for="client-inn">ИНН</label>
    <div class="controls">
      <input type="text" id="client-inn" placeholder="ИНН">
    </div>
  </div>
  </div>
  <div class="modal-footer first">
    <button class="btn btn-primary save-client">Сохранить</button>
    <button class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</button>
  </div>
   <div class="modal-body second hide">
    <div class="alert alert-error">
      Клиент с таким названием существует. Объединить клиентов в одно?
    </div>
  </div>
  <div class="modal-footer second hide">
    <button class="btn btn-primary save-client-add">Да</button>
    <button class="btn btn-warning save-client-ok">Нет</button>
    <button class="btn save-client-cancel">Отмена</button>
  </div>
</div>
