%def scripts():
     <script src="/static/scripts/routine.js?v={{version}}"></script>
     <script src="/static/scripts/esud_configuration_update/app.js?v={{version}}"></script>
     <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
     <script>$(function() {
            $.ajaxSetup({timeout:50000});
            var app = new AppView();
        });
    </script>
%end
%rebase master_page/base page_title='ЭСУД. Обновление значений свойств', current_user=current_user, version=version, scripts=scripts,menu=menu
<style>
    #configuration-panel{
        padding-top:10px;
    }
    #configuration-panel .line{
        float:left;
        width:100%;
    }
    #claims-list .claim-item{
        float:left;
        width:100%;
        margin-top: 20px;
        border-bottom:dashed 1px #000;
        padding-bottom: 20px;
    }
    .lbl{
      color: #666;
    }
</style>

<div id="container">
    <div class = "row hidden-print">
        <div  class="span12">
            <div class="navbar-inner" id="configuration-panel">
                        <textarea class="span11 tb-data" placeholder = 'Формат данных:[{"configs": ["534.009"],"props": [{"prop":"576b75886b3484000364c74b", "val":"563c4c2a648d480003c5889d", "unit":""}]}]' rows="3" ></textarea>
                        <span class = "lbl">
                            <b>Примеры входных данных:</b> <br/>
                            <em>Обновление зачения свойства: [{"configs": ["534.009"],"props": [{"prop":"576b75886b3484000364c74b", "val":"563c4c2a648d480003c5889d", "unit":""}]}]<br><br/> Важно! ID свойства необходимо брать из модели конфигурации.
                        </span>
                        <br/><br/><br/>
                        <button class="btn btn-default btn-save" style = "margin:10px;"><i class="fa fa-upload"></i>&nbsp;&nbsp;Выполнить</button>
            </div>
        </div>
    </div>
    <br>
    <br>
    <table class="table table-bordered table-result">
      <thead>
        <tr class="info">
          <th>Конфигурация</th>
          <th>Свойство</th>
          <th>Значение</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
</div>

<script id="tableRowTemplate" type="text/template">
    <tr>
        <td><%= number %></td>
        <td><%= prop_name %></td>
        <td><%= prop_value %></td>
        <td title = "<%=('msg' in obj)?msg:''%>"><%= status %></td>
    </tr>
</script>

