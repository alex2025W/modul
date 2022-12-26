%def scripts():
    <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/ats.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
    <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
    <script src="/static/scripts/ats/app.js?v={{version}}"></script>
    <script src="/static/scripts/ats/view_pager.js?v={{version}}1"></script>
    <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="/static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
    <script>$(function() {
            $.ajaxSetup({timeout:50000});
            bootbox.setDefaults({locale: "ru",});
             App.initialize();
             $("#ats").show();
        });
    </script>
%end
%rebase master_page/base_lastic page_title='CRM. Входящие', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

<!--=========ATS LIST=====================-->
<!--==ITEM=======================-->
<script id="listAtsItemTemplate" type="text/template">
    <td><%=date%></td>
    <td><%=ats_id%></td>
    <td><%=phone_number%></td>
    <td><%=call_to%></td>
    <td>
        <%if(client){%>
            <a href = "/client-card/<%=client['id']%>"><%=client['name']%></a>
        <%}%>
    </td>
    <td><button class="btn btn-success btn-small btn-check-ats " data-phone="<%=phone_number%>">Обновить</button></td>
</script>
<!--==PAGER=====================-->
<script type="text/template" id="pagerTemplate">
  <div class="list-pager">
    <% var start = cur_page-5;
       if (start<1) start = 1;
       var end = start+10;
       if(end>count)
          end = count;%>
      <% if(start>1) { %><span class="over">...</span><% } %>
      <% for(var i=start;i<=end;++i) {%>
        <% if(i==cur_page) {%>
          <span class="cur"><%= i %></span>
        <% } else {%>
          <a data-page="<%= i %>"><%=i %></a>
        <% } %>
      <%}%>
      <% if(end<count) { %><span class="over">...</span><% } %>
  </div>
</script>
<!--======================================-->

<div id="ats" style = "display:none">
    <div  class="span12" style = "width:99%; margin-top:30px;">
        <!--=======Панель управления=================================-->
        <div class="navbar" id="navigationButtons">
            <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
                <div class = "line">
                    <div class="input-prepend input-append full-view simple-view" style = "float:right">
                        <input type="text" id="update_date" style="width:100px; border-radius:4px 0 0 4px" value="" placeholder="08.12.2015">
                        <button class="btn btn-success btn-load-ats-data" id = "btn_load_ats_data"  >Обновить</button>
                    </div>
                </div>
            </div>
        </div>
        <!--=======Форма работы со списокм спецификаций===============-->
        <div id = "ats_list_body" class="data-list-body" style = "display:none">
            <div class = "line data-container" >
                 <table class = 'in-info'>
                    <thead>
                        <tr>
                            <td style = "width:20%">Дата</td>
                            <td style = "width:10%">ATS ID</td>
                            <td style = "width:15%">Входящий номер</td>
                            <td style = "width:20%">Принял</td>
                            <td style = "width:25%">Клиент</td>
                            <td style = "width:10%">Действие</td>
                        </tr>
                    </thead>
                    <tbody class = "spec-data-list"></tbody>
                </table>
            </div>
            <div class = "line ats-list-pager" id = "ats-list-pager"></div>
        </div>
        <!--============================================================-->
    </div>
</div>
