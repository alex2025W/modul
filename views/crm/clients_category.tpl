%import json

%def scripts():
  <script src="static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="static/scripts/clients_category/app.js?v={{version}}"></script>
  %if last_update_date:
    <div class="scheduler-date-update">
      Последнее обновление:
      <script>
        document.write(Routine.convertDateToLocalTime('{{! last_update_date }}'));
      </script>
    </div>
  %end
%end
%rebase master_page/base page_title='CRM. Клиенты по категориям', current_user=current_user, version=version, scripts=scripts,menu=menu
<style>
  .clients-list-pager{
      text-align: center;
      font-size:18px;
    }
    .clients-list-pager span.over{
      color:#666;
    }
    .clients-list-pager span.cur{
      font-weight: bold;
      padding:0 3px;
    }
    .clients-list-pager a{
      padding:0 3px;
      cursor: pointer;
    }
    .clients-list th a{
      color:#333;      
      text-decoration: none;
    }

    .clients-list th a span{
      border-bottom:dashed 1px;
    }

    .clients-list th a:hover span{
      border-bottom-style: none;
    }

    .clients-list th a.sort-up:after{
      content: "\2191";
      padding-left: 20px;
    }

    .clients-list th a.sort-down:after{
      content: "\2193";
      padding-left: 20px;
    }
</style>
<div id="clientsContainer">
  <div class="row hidden-print">
        <div class="span12">
            <div class="navbar">
                <div id="pnlClientsFilter" class="navbar-inner" style="padding-top:10px">
                    <div class="filters hidden-print" id="filters-list">
                    <div class='input-append pnl-ddl-cat-cost' style='margin:3px 0px 3px 0px;'>
                      <label style="line-height: 30px;">Кат., руб.
                        <select class="ddl-cat-cost" multiple="multiple">
                          <option value="is_a">A</option>
                          <option value="is_b">B</option>
                          <option value="is_c">С</option>
                        </select>
                      </label>
                    </div>
                    &nbsp;&nbsp;
                    <div class='input-append pnl-ddl-cat-sq' style='margin:3px 0px 3px 0px;'>
                      <label style="line-height: 30px;">Кат., м2
                        <select class="ddl-cat-sq" multiple="multiple">
                          <option value="is_a">A</option>
                          <option value="is_b">B</option>
                          <option value="is_c">С</option>
                        </select>
                      </label>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    </div>
    <div id="clientsListContainer">
    </div>
</div>
<script type="text/template" id="clientsListTemplate">
  <table class="clients-list table table-striped">
    <thead>
      <tr>
        <th><a href="javascript:;" class="sort-down" data-sort="name"><span>Название</span></a></th><th><a href="javascript:;" data-sort="abc-price"><span>Кат., руб.</span></a></th><th><a href="javascript:;" data-sort="abc-sq"><span>Кат., м2</span></a></th><th><a href="javascript:;" data-sort="last_contact_date"><span>Дата посл. контакта</span></a></th><th><a href="javascript:;" data-sort="order_count"><span>Заявки</span></a></th>
      </tr>
    </thead>
    <tbody>
      <% for(var i in clients) { var cc = clients[i];%>
        <tr>
          <td><a href="/client-card/<%= cc['_id'] %>"><%= cc['name'] %></a></td>
          <td>
            <%= cc['last_abc_status']['price']['is_a']?'A':(cc['last_abc_status']['price']['is_c']?'C':'B') %>
          </td>
          <td>
            <%= cc['last_abc_status']['square']['is_a']?'A':(cc['last_abc_status']['square']['is_c']?'C':'B') %>
          </td>
          <td>
            <%= cc.last_contact_date?moment(cc.last_contact_date).format("DD.MM.YYYY"):"" %>
          </td>
          <td>
            <a href="/app#orders/&cl=<%= cc['_id'] %>&o=all&c=total&m=&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off"><%= cc['orders'].length %></a>
          </td>
        </tr>
      <% } %>
    </tbody>
  </table>
  <div class="clients-list-pager">
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
