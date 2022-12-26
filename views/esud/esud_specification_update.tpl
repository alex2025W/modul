%def scripts():
     <script src="/static/scripts/routine.js?v={{version}}"></script>
     <script src="/static/scripts/esud_specification_update/app.js?v={{version}}"></script>
     <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
     <script>$(function() {
            $.ajaxSetup({timeout:50000});
            var app = new AppView();
        });
    </script>
%end
%rebase master_page/base page_title='Спецификации. Обновление значений свойств', current_user=current_user, version=version, scripts=scripts,menu=menu
<style>
    #specification-panel{
        padding-top:10px;
    }
    #specification-panel .line{
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
            <div class="navbar-inner" id="specification-panel">
                        <textarea class="span11 tb-data" placeholder = 'Формат данных: [{"config": "533.068", "props": ["54d0a1897bad640003abbbe8"]}]' rows="3" ></textarea>
                        <span class = "lbl">
                            <b>Примеры входных данных:</b> <br/>
                            <em>Обновление зачения свойства: [{"config": "533.068", "props": ["54d0a1897bad640003abbbe8"]}]</em><br/>
                            <em>Обновление наименования: [{"config": "533.068", "props": ["name"]}]</em>
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
          <th>Спецификация</th>
          <th>Свойство</th>
          <th>Значение</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
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

