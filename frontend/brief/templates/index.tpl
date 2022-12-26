%def scripts():
  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/brief/styles/brief.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/brief/scripts/app.js?v={{version}}"></script>
  <script>
    $(function() {App.initialize();});
  </script>
%end
%rebase master_page/base page_title='Повестка дня', current_user=current_user, version=version, scripts=scripts,menu=menu, sector_types=sector_types
<!-- Templates -->
<script id="filterItemTemplateSector" type="text/template">
    <option value = "<%=code%>" <%=(enabled)?"":"disabled"%><%=(checked)?"selected":""%>  ><%="[" + code + "] " + name%></option>
</script>
<script id="filterItemTemplateOrder" type="text/template">
    <option value = "<%=number%>" <%=(checked)?"selected":""%>><%="[" + number + "]"%></option>
</script>
<script id="filterItemTemplateReason" type="text/template">
    <option value = "<%=name%>" <%=(enabled)?"":"disabled"%><%=(checked)?"selected":""%>><%=name%></option>
</script>
<script id="briefDataTemplate" type="text/template">
  <div class = 'css-treeview'>
    <%
    if(obj==null || obj.length==0){%>
      <h5>По заданным параметрам ничего не найдено.</h5>
    <%}
    else{%>
      <ul>
      <li class = 'h1'><label class = 'lbl-plus' for="item-0">&nbsp;</label><input type="checkbox" id="item-0" /><label class = "lbl-item h1 color-red" for="1item-0">Отклонения [<%=obj['bad_stat']['count']%>]</label>
      <%if(obj['bad_stat']['count']==0){%>
        <ul>
        <li class = 'lbl-info'>
          <span>Отклонения не найдены</span>
        <ul></ul>
        </li>
        </ul>
      <%}
      else{%>
        <ul>
        <%
        items = obj['bad_stat']['items'];
        var c=0;
        for (var contract_item_number in items){
        var contract_info = items[contract_item_number]['info'];%>
        <li class = 'h2'><label class = 'lbl-plus' for="item-0-<%=c%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>"/><label  class = "lbl-item h2" for="1item-0-<%=c%>"><%=contract_item_number%> (<%=contract_info['client_name']%>) [<%=items[contract_item_number]['count']%>]</label>
          <ul>
        <%var i=0;
        for(var order_number in items[contract_item_number]['items']){
          var h=0;
          var order_info = items[contract_item_number]['items'][order_number]['info'];%>
          <li class = 'h3'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>"/><label  class = "lbl-item h3 bold" for="1item-0-<%=c%>-<%=i%>">Заказ <%=order_number%> (<%=order_info['product_name']%>) [<%= items[contract_item_number]['items'][order_number]['count']%>]</label>
          <ul>
          <%for(var sector_type in items[contract_item_number]['items'][order_number]['items']){
            var j=0;
            var sector_type_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['info'];%>
            <li class = 'h3'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>-<%=h%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>-<%=h%>"/><label  class = "lbl-item h3" for="1item-0-<%=c%>-<%=i%>-<%=h%>"><%=sector_type_info['sector_type']%> [<%=items[contract_item_number]['items'][order_number]['items'][sector_type]['count']%>]</label>
            <ul>
              <%for(var number in items[contract_item_number]['items'][order_number]['items'][sector_type]['items']){
                var k=0;
                var sector_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['info'];%>
                <li class = 'h3'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>"/><label  class = "lbl-item h3" for="1item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>">Наряд <%=number%>: <%=sector_info['sector_name']%> [<%=sector_info['sector_code']%>] [<%=items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['count']%>]</label>
                <ul>
                <%for(var work_index in items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items']){
                  var work = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items'][work_index] %>
                  <li class = 'h4'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>-<%=k%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>-<%=k%>"/><label  class = "lbl-item h4" for="1item-0-<%=c%>-<%=i%>-<%=h%>-<%=j%>-<%=k%>"><%=work['plan_work_name']%> [<%=work['plan_work_code']%>]</label>
                    <ul>
                    <li class = 'lbl-info'>
                    <%
                    var last_status_log = work['cur_status'];
                    var plan_work_status =  (last_status_log)?last_status_log['status']:''
                    var status_name = '';
                    switch(plan_work_status){
                      case 'on_hold':%>
                        <div>Простой</div>
                        <div>Причина: <%=(last_status_log!=null)?last_status_log['reason']:''%></div>
                        <div>Комментарий: <%=(last_status_log!=null)?last_status_log['note']:''%></div>
                        <div>Пользователь: <%=(last_status_log!=null)?last_status_log['user_email']:''%></div>
                        <div>Дата ввода: <%=(last_status_log!=null)? new Date(last_status_log['date']).format("dd/mm/yyyy"):''%></div>
                      <%break;
                      case 'on_pause':%>
                        <div>Приостановка</div>
                        <div>Причина: <%=(last_status_log!=null)?last_status_log['reason']:''%></div>
                        <div>Комментарий: <%=(last_status_log!=null)?last_status_log['note']:''%></div>
                        <div>Пользователь: <%=(last_status_log!=null)?last_status_log['user_email']:''%></div>
                        <div>Дата ввода: <%=(last_status_log!=null)? new Date(last_status_log['date']).format("dd/mm/yyyy"):''%></div>
                      <%break;
                      case 'on_work_with_reject':%>
                        <div>Работа с отклонением</div>
                        <div>Причина: <%=(last_status_log!=null)?last_status_log['reason']:''%></div>
                        <div>Комментарий: <%=(last_status_log!=null)?last_status_log['note']:''%></div>
                        <div>Пользователь: <%=(last_status_log!=null)?last_status_log['user_email']:''%></div>
                        <div>Дата ввода: <%=(last_status_log!=null)? new Date(last_status_log['date']).format("dd/mm/yyyy"):''%></div>
                      <%break;
                      default:%>
                        <div>Нет данных</div>
                      <%break;
                    }%>
                    </li>
                    </ul>
                  </li>
                <%k++;}%>
                </ul>
                </li>
              <%j++;}%>
            </ul>
            </li>
          <%h++;}%>
          </ul>
          </li>
        <%i++;}%>
        </ul>
        </li>
        <%c++;}%>
        </ul>
      <%}%>
      </li>
      <!-- END BAD STAT -->
      <!-- START GOOD STAT -->
      <%
      var i=1;
      for(var ik in obj['stat'])
      {
        if(typeof(obj['stat'][ik]) == "object" && obj['stat'][ik]['count']>0)
        {%>
        <li class = 'h1'><label class = 'lbl-plus' for="item-<%=i%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>" /><label class = "lbl-item h1" for="1item-<%=i%>"><%=obj['stat'][ik]['name']%> [<%=obj['stat'][ik]['count']%>]</label>
        <ul>
        <%
        var j=0;
        for(var jk in obj['stat'][ik])
        {
          if(typeof(obj['stat'][ik][jk]) == "object" && obj['stat'][ik][jk]['count']>0)
          {%>
          <li class = 'h2'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>"/><label  class = "lbl-item h2" for="1item-<%=i%>-<%=j%>"><%=obj['stat'][ik][jk]['name']%> [<%=obj['stat'][ik][jk]['count']%>]</label>
          <ul>
          <%
          var k=0;
          var items = obj['stat'][ik][jk]['items'];
          for (var contract_item_number in items){
          var contract_info = items[contract_item_number]['info'];%>
            <li class = 'h3'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>"/><label  class = "lbl-item h3" for="1item-<%=i%>-<%=j%>-<%=k%>"><%=contract_item_number%> (<%=contract_info['client_name']%>) [<%=items[contract_item_number]['count']%>]</label>
            <ul>
            <%
            var l=0;
            for(var order_number in items[contract_item_number]['items']){
            var h=0;
            var order_info = items[contract_item_number]['items'][order_number]['info'];%>
            <li class = 'h4'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>"/><label  class = "lbl-item h4" for="1item-<%=i%>-<%=j%>-<%=k%>-<%=l%>">Заказ <%=order_number%> (<%=order_info['product_name']%>) [<%=items[contract_item_number]['items'][order_number]['count']%>]</label>
            <ul>
            <%for(var sector_type in items[contract_item_number]['items'][order_number]['items']){
              var m=0;
              var sector_type_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['info'];%>
              <li class = 'h5'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>"/><label  class = "lbl-item h5" for="1item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>"><%=sector_type_info['sector_type']%> [<%=items[contract_item_number]['items'][order_number]['items'][sector_type]['count']%>]</label>
              <ul>
                  <%for(var number in items[contract_item_number]['items'][order_number]['items'][sector_type]['items']){
                  var n=0;
                  var sector_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['info'];%>
                  <li class = 'h5'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>-<%=m%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>-<%=m%>"/><label  class = "lbl-item h5" for="1item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>-<%=m%>">Наряд <%=number%>: <%=sector_info['sector_name']%> [<%=sector_info['sector_code']%>] [<%= items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['count']%>]</label>
                  <ul>
                  <%for(var work_index in items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items']){
                  var work = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items'][work_index] %>
                  <li class = 'lbl-info'>
                    <%=work['plan_work_name']%> [<%=work['plan_work_code']%>]
                  <ul>
                  </ul>
                  </li>
                  <%n++;}%>
                  </ul>
                  </li>
                  <%m++;}%>
              </ul>
              </li>
              <%h++;}%>
            </ul>
            </li>
            <%l++;}%>
            </ul>
            </li>
          <%k++;}%>
          </ul>
          </li>
          <%j++;}
        }%>
        </ul>
        </li>
        <%i++;}
      }%>
      </ul>
    <%}%>
  </div>
</script>

<script id="briefDataTemplateTable" type="text/template">
  <div class = 'css-treeview'>
    <%
    if(obj==null || obj.length==0){%>
      <h5>По заданным параметрам ничего не найдено.</h5>
    <%}
    else{%>
      <!-- START BAD STAT -->
      <ul>
      <li class = 'h1'><label class = 'lbl-plus' for="item-0">&nbsp;</label><input type="checkbox" id="item-0" /><label class = "lbl-item h1 color-red" for="1item-0">Отклонения [<%=obj['bad_stat']['count']%>]</label>
      <%if(obj['bad_stat']['count']==0){%>
        <ul>
        <li class = 'lbl-info'>
          <span>Отклонения не найдены</span>
        <ul></ul>
        </li>
        </ul>
      <%}
      else{%>
        <ul>
        <%
        items = obj['bad_stat']['items'];
        var c=0;
        for (var contract_item_number in items){
        var contract_info = items[contract_item_number]['info'];%>
        <li class = 'h2'><label class = 'lbl-plus' for="item-0-<%=c%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>"/><label  class = "lbl-item h2" for="1item-0-<%=c%>"><%=contract_item_number%> (<%=contract_info['client_name']%>) [<%=items[contract_item_number]['count']%>]</label>
          <ul>
        <%var i=0;
        for(var order_number in items[contract_item_number]['items']){
          var h=0;
          var order_info = items[contract_item_number]['items'][order_number]['info'];%>
          <li class = 'h3'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>"/><label  class = "lbl-item h3 bold" for="1item-0-<%=c%>-<%=i%>">Заказ <%=order_number%> (<%=order_info['product_name']%>)  [<%= items[contract_item_number]['items'][order_number]['count']%>]</label>
          <ul>
          <%for(var sector_type in items[contract_item_number]['items'][order_number]['items']){
            var j=0;
            var sector_type_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['info'];%>
            <li class = 'h3'><label class = 'lbl-plus' for="item-0-<%=c%>-<%=i%>-<%=h%>">&nbsp;</label><input type="checkbox" id="item-0-<%=c%>-<%=i%>-<%=h%>"/><label  class = "lbl-item h3" for="1item-0-<%=c%>-<%=i%>-<%=h%>"><%=sector_type_info['sector_type']%>  [<%=items[contract_item_number]['items'][order_number]['items'][sector_type]['works_count']%>]</label>
            <ul>
            <li>
            <table class = 'in-info'>
            <thead>
              <tr>
                <td>Участок</td>
                <td>Наряд</td>
                <td>Работа</td>
                <td>Статус</td>
                <td>Причина</td>
                <td>Комментарий</td>
              </tr>
            </thead>
            <tbody>
              <%for(var number in items[contract_item_number]['items'][order_number]['items'][sector_type]['items']){
                var k=0;
                var sector_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['info'];%>
                <%for(var work_index in items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items']){
                  var work = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items'][work_index]
                  var last_status_log = work['cur_status'];
                  var plan_work_status =  (last_status_log)?last_status_log['status']:''
                  var status_name = '';
                  switch(plan_work_status){
                    case 'on_hold': status_name = 'Простой'; break;
                    case 'on_pause': status_name = 'Приостановка'; break;
                    case 'on_work_with_reject': status_name = 'Работа&nbsp;с&nbsp;отклонением'; break;
                    default: status_name = 'Нет&nbsp;данных';  break;
                  }%>
                  <tr class = "tr-info">
                  <td style = 'width:20%'><%=sector_info['sector_name']%>&nbsp;[<%=sector_info['sector_code']%>]</td>
                  <td style = 'width:10%'><%=number%></td>
                  <td style = 'width:40%'><%=work['plan_work_name']%>&nbsp;[<%=work['plan_work_code']%>]</td>
                  <td style = 'width:5%'><%=status_name%></td>
                  <td style = 'width:10%'><%=(last_status_log!=null && last_status_log['reason'])?last_status_log['reason']:'Нет&nbsp;данных'%></td>
                  <td style = 'width:15%'>
                    <%if(last_status_log && last_status_log['note']){%>
                    <%=last_status_log['note']%><br/>
                    <%=last_status_log['user_email']%> (<%=new Date(last_status_log['date']).format("dd/mm/yyyy")%>)
                    <%}%>
                  </td>
                  </tr>
                <%k++;}%>
              <%j++;}%>
            </tbody>
            </table>
            </li>
            </ul>
            </li>
          <%h++;}%>
          </ul>
          </li>
        <%i++;}%>
        </ul>
        </li>
        <%c++;}%>
        </ul>
      <%}%>
      </li>
      <!-- END BAD STAT -->
      <!-- START GOOD STAT -->
      <%
      var i=1;
      for(var ik in obj['stat'])
      {
        if(typeof(obj['stat'][ik]) == "object" && obj['stat'][ik]['count']>0)
        {%>
        <li class = 'h1'><label class = 'lbl-plus' for="item-<%=i%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>" /><label class = "lbl-item h1" for="1item-<%=i%>"><%=obj['stat'][ik]['name']%> [<%=obj['stat'][ik]['count']%>]</label>
        <ul>
        <%
        var j=0;
        for(var jk in obj['stat'][ik])
        {
          if(typeof(obj['stat'][ik][jk]) == "object" && obj['stat'][ik][jk]['count']>0)
          {%>
          <li class = 'h2'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>"/><label  class = "lbl-item h2" for="1item-<%=i%>-<%=j%>"><%=obj['stat'][ik][jk]['name']%> [<%=obj['stat'][ik][jk]['count']%>]</label>
          <ul>
          <%
          var k=0;
          var items = obj['stat'][ik][jk]['items'];
          for (var contract_item_number in items){
          var contract_info = items[contract_item_number]['info'];%>
            <li class = 'h3'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>"/><label  class = "lbl-item h3" for="1item-<%=i%>-<%=j%>-<%=k%>"><%=contract_item_number%> (<%=contract_info['client_name']%>) [<%=items[contract_item_number]['count']%>]</label>
            <ul>
            <%
            var l=0;
            for(var order_number in items[contract_item_number]['items']){
            var h=0;
            var order_info = items[contract_item_number]['items'][order_number]['info'];%>
            <li class = 'h4'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>"/><label  class = "lbl-item h4" for="1item-<%=i%>-<%=j%>-<%=k%>-<%=l%>">Заказ <%=order_number%> (<%=order_info['product_name']%>) [<%=items[contract_item_number]['items'][order_number]['count']%>]</label>
            <ul>
            <%for(var sector_type in items[contract_item_number]['items'][order_number]['items']){
              var m=0;
              var sector_type_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['info'];%>
              <li class = 'h5'><label class = 'lbl-plus' for="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>">&nbsp;</label><input type="checkbox" id="item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>"/><label  class = "lbl-item h5" for="1item-<%=i%>-<%=j%>-<%=k%>-<%=l%>-<%=h%>"><%=sector_type_info['sector_type']%> [<%=items[contract_item_number]['items'][order_number]['items'][sector_type]['works_count']%>]</label>
              <ul>
              <table class = 'in-info'>
              <thead>
              <tr>
                <td>Участок</td>
                <td>Наряд</td>
                <td>Работа</td>
              </tr>
              </thead>
              <tbody>
                <%for(var number in items[contract_item_number]['items'][order_number]['items'][sector_type]['items']){
                var n=0;
                var sector_info = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['info'];
                for(var work_index in items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items']){
                var work = items[contract_item_number]['items'][order_number]['items'][sector_type]['items'][number]['items'][work_index] %>
                <tr class = "tr-info">
                  <td style = 'width:30%'><%=sector_info['sector_name']%>&nbsp;[<%=sector_info['sector_code']%>]</td>
                  <td style = 'width:10%'><%=number%></td>
                  <td style = 'width:60%'><%=work['plan_work_name']%>&nbsp;[<%=work['plan_work_code']%>]</td>
                </tr>
                <%n++;}%>
                <%m++;}%>
              </tbody>
              </table>
              </ul>
              </li>
              <%h++;}%>
            </ul>
            </li>
            <%l++;}%>
            </ul>
            </li>
          <%k++;}%>
          </ul>
          </li>
          <%j++;}
        }%>
        </ul>
        </li>
        <%i++;}
      }%>
      </ul>
    <%}%>
  </div>
</script>

<div id="brief" >
  <div class = "row hidden-print">
    <div  class="span12">
      <div class="navbar">
        <div  id = "pnlBriefFilter" class="navbar-inner" style=  "padding-top:10px" >
          <div style="">
            <div class="input-prepend input-append">
              <span class="add-on"><b class="icon-list-alt"></b></span>
              <div class="input-append date date-picker">
                <input class ='tbDate' type="text" class="span2"  value = ""  disabled><span class="add-on"><i class="icon-th"></i></span>
              </div>
            </div>
            <button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; display:none"  ><i class="icon-download-alt"></i></button>

            <button class="btn btn-view-style btn-list" value = 'list' style = "float:right; margin:3px 0px 3px 0px;"><i class="fa fa-list"></i></button>
            <button class="btn btn-view-style btn-table active" value = 'table' style = "float:right; margin:3px 0px 3px 0px;"><i class="fa fa-table"></i></button>
          </div>
          <div style = "margin-top:10px; margin-bottom:10px;">
            <!--order filter-->
            <div class='input-append pnl-ddl-orders' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-orders" multiple="multiple"  style = "display:none"></select></div>
            <!--sectior type filter-->
            <div class='input-append pnl-ddl-sector-types' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-sector-types" multiple="multiple"  style = "display:none">
              %for row in sector_types:
                <option value="{{ row['type'] }}">{{ row['type'] }}</option>
              %end
            </select></div>
            <!--Sectors filter-->
            <div class='input-append pnl-ddl-sectors' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-sectors" multiple="multiple"  style = "display:none"></select></div>
            <!--cancel type filter-->
            <div class='input-append pnl-ddl-statuses' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-statuses" multiple="multiple"  style = "display:none">
              <option value = 'on_hold'>Простой</option>
              <option value = 'on_pause'>Приостановка</option>
              <option value = 'on_work_with_reject'>Работа с отклонением</option>
              <option value = ''>Нет данных</option>
            </select></div>
            <!--reason filter-->
            <div class='input-append pnl-ddl-reasons' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-reasons" multiple="multiple"  style = "display:none"></select></div>
            <!--collapse/uncollapse-->
            <button value = "collapsed" class="btn btn-collapse" style = "display:none; float:right; margin:3px 0px 3px 0px;"><i class="icon-folder-close"></i>&nbsp;&nbsp;Расскрыть группы</button>
            <button id= "btnBriefFind" class="btn btn-primary btn-filter" style = "display:none">Найти</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="pnlBriefBody" class="brief-body">
    <div class="lbl-header"></div>
    <!--Data Container-->
    <div class = "line data-container" id="pnlBriefContainer">
    </div>
  </div>
</div>
