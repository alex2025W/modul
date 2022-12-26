%import json
%import routine
%def scripts():

<!--styles-->
<link rel="stylesheet" href="/static/css/selectize.bootstrap2.css?v={{version}}">
<link href="/static/css/jquery.textcomplete.css?v={{version}}" rel="stylesheet" media="screen, print">
<link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
<!--scripts-->
<script src="/static/scripts/statistics.js?v={{version}}"></script>
<script src="/static/scripts/orderroutine.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
 <script src="/static/scripts/libs/bootstrap-slider.js?v={{version}}"></script>
 <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
 <!--<script src="/static/scripts/libs/daterangepicker.js?v={{version}}"></script>-->
 <script src="/static/scripts/libs/daterangepicker2.js?v={{version}}"></script>
 <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
 <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
 <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
 <script src="/static/scripts/order.js?v={{version}}111"></script>
 <script src="/static/scripts/select2.js?v={{version}}"></script>
 <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
 <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
 <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
 <script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
 <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>
 <script src="/static/scripts/libs/jquery.textcomplete.js?v={{version}}"></script>
 <script>
    $(function(){
      bootbox.setDefaults({locale: "ru",});
      window.SOSTDAYS = $.parseJSON('{{!json.dumps(routine.get_sost_days())}}');
      window.WEEKENDS = $.parseJSON('{{!json.dumps(routine.get_weekends())}}');
      window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
      window.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
      window.DICTS = {{! json.dumps( dict(map(lambda x: (str(x.get('_id')), x.get('name')), dicts)) )}} ;
      window.DICTS.where_find = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 2])}}];
      window.DICTS.client_type = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 12])}}];
      window.DICTS.first_contact = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 1])}}];
      window.DICTS.reason = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 7])}}];
      window.DICTS.review = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 13])}}];
      window.DICTS.interests = [{{!', '.join(['\''+i['name']+'\'' for i in dicts if i['type'] == 14])}}];
      window.DICTS.condition = $.parseJSON('{{!json.dumps(map(lambda x: {'name':x['name'], 'price':x['price'], 'sq': x['sq'] if 'sq' in x else 'disabled', 'property':x['property']}, filter(lambda i: i['type'] == 3, dicts)))}}');
      window.App = new AppView({order_id:'{{order_id}}', client_id: '{{order_client_id}}', client: '{{order_client}}'});
      window.ORDER_CONDITIONS= {{!json.dumps(orders_conditions)}};
    });
 </script>
%end
%rebase master_page/base page_title='CRM', current_user=current_user, version=version, scripts=scripts, menu=menu

<style>
  body{
  }
.font18{
    font-size: 18px;
  }
  .condition-date
  {
    font-size:11px;
    line-height:100%;
    padding:3px 0px 0px 0px;
  }

  .show-tasks-lnk {
    display: block;
    padding:9px 6px;
}

  .show-chance-str {
    color:#ffa0a0;
  }

  .container1{
    width:1200px;
  }
  .wr1{
   width:1200px!important;
  }
  #client-orders-list .span12{
    width:1200px;
  }
  .nowrap{
    white-space: nowrap;
    padding:0px 4px;
  }
  .nowrap1{
    white-space: nowrap;
  }
  #client-orders-list table{
    /*width: 100%;*/
    /*table-layout:fixed; word-break:break-all;*/
    border: 0px;
    margin-bottom: 40px;
    margin-top: 10px;
  }
#order-item .table-item{
  border: 0px;
  border-top: 1px solid #fff;
}

  .order-head{
    border-bottom: 1px solid #999999;
    font-size: 14px;
  }
  .order-details{
    background: #F3F3F3;
    font-size: 12px;
  }
  .order-details td:first-child{
    position: relative;
  }
  .order-details td{
    border: 1px solid #666
  }
  .client-card-favorite{
    /*position: absolute;*/
    width:20px;
    height: 20px;
    left: -15px;
    top: 8px;
    color: #000;
    text-decoration: none;
    display: none;
  }
  .client-card-favorite:hover{
    text-decoration: none;
  }

  .order-current-status{
    background: #CFE2F3;
  }
  .order-col1{
    float:left;
    width:220px;
  }
  .order-col2{
    float:left;
    width: 50px;
    white-space: nowrap;
    margin: 0 5px;
  }
  .order-col4{
    float:left;
    width: 50px;
    white-space: nowrap;
  }
  .order-col3{
    float:left;
    width:120px;
    margin: 0 5px;
  }
  .order-col4{
    float:left;
    width:100px;
  }
  .select2-results{
    font-size:12px;
  }
  .select2-results .select2-result-label
  {
    padding:5px 7px 5px;
  }
  .select2-results li
  {
    line-height:normal;
    border-bottom:solid 1px #ddd;
  }
  .span1_5{
    float: left;
    width:100px;
  }
  .manager-label{
    position: relative;
    padding-left: 18px;
  }
  .filter-favorite{
    position: absolute;
    width: 20px;
    height: 20px;
    left: -20px;
    top: 25px;
    color: #000;
  }
  .lnk-order-number
  {
    color:#999;
  }
  .lnk-order-number:hover
  {
    color:#000;
  }
  .hideme{
    display: none;
  }
  .lbl_header{
    font-size:22px;
  }
  .bootbox-confirm.modal{
      width:450px;
      margin-left:-175px;
      z-index: 2000;
  }
   .is-tender{
    margin:0 !important;
  }
.blink{
  animation-name: blinker;
  animation-duration: 0.5s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
@keyframes blinker {
    0% { opacity: 1.0; }
    50% { opacity: 0.5; }
    100% { opacity: 1.0; }
}
.same-finded li a{
  white-space: nowrap; /* Запрещаем перенос строк */
  overflow: hidden; /* Обрезаем все, что не помещается в область */
  padding: 5px; /* Поля вокруг текста */
  text-overflow: ellipsis;
  max-width: 600px;
  display:inline-block;
}
.same-finded li .btn-mini{
  margin:2px 0 2px 10px;
}
.same-finded ul{
  display: block;
}
.customer-project-block .token-input-list{
  margin-left: 40px;
}
.customer-project-block  li.token-input-token{
  display: inline-block;
  padding-right: 25px;
  margin:0px 3px;
}
.customer-project-block  li.token-input-input-token{
  display: inline-block;
  margin:0px 3px;
}
.customer-project-block  li.token-input-input-token input{
  float:left;
}
.collapsible {
    padding:10px;
    background-color: white;
    border: 1px solid !important;
    padding-bottom: 20px !important;
    margin-bottom: 20px !important;
}
.row .row-collapsible {
    margin-left: 0 !important;
}
.lnk-google-docs
{
  vertical-align: top;
}
.products-table td {
    position: relative;
}
.product-links {
    position: absolute;
    left: -26px;
    top: 20%;
    padding: 3px;
    border-radius: 5px;
    border: 1px solid transparent;
}
.product-links.selected {
    color: rgb(0, 94, 239);
    border: 1px solid gray;
    border-radius: 5px 5px 0px 5px;
}
.product-links.filled {
    color: rgb(29, 189, 85);
}
.product-links:hover {
    border: 1px solid gray;
    cursor: pointer;
}
.linked-orders {
    width: 272px;
    border: 1px solid gray;
    background: #F3F3F3;
    z-index:1;
    border-radius: 0px 5px 5px 5px;
    position: absolute;
    display: none;
    padding: 10px 5px 10px 10px;
}
.linked-orders .save-linked-orders {
    font-size: 24px;
    width: 24px;
    height: 24px;
    padding: 6px;
    margin-left: 5px;
}
.token-input-list{
  margin-left: 40px;
  float:left;
  width: 218px !important;
}
li.token-input-token{
  display: inline-block;
  padding-right: 25px;
  margin:0px 3px;
}
li.token-input-input-token{
  display: inline-block;
  margin:0px 3px;
}
li.token-input-input-token input{
  margin-top: 3px;
  margin-bottom: 0px !important;
  float:left;
}
.manager-link {
    font-size: 11px;
}
.projects-list-container .token-input-list {
    width:100% !important;
    margin-left:0;
}
.left-border{
  border-left: 1px solid #000;
}
.error1{
  background: #FF6666;
}
</style>

<div id="one-order">
  <div id="order-item"></div>
  <div id="client-roles" class="span12"  style = "width:1180px; display:none;"></div>
  <div id="products-list" class="span12" style = "width:1180px; display:none;"></div>
  <div id="history-list" class="span12" style = "width:1180px; display:none;"></div>
  <div id="tasks-list" class="span12"  style = "width:1180px; display:none;"></div>
</div>

<!--<div id="task-modal" class="modal hide" tabindex="-1" role="dialog" aria-hidden="true"></div>-->

<div id="position-modal" data-backdrop="static" class="modal hide" role="dialog" aria-hidden="true"></div>

<script id="confirmSaveChangesTemplate" type="text/template">
  <div id="" style="position:fixed; width:100%; height:100%; left:0; top:0; background:rgba(0,0,0,0.8); z-index: 9000;">
    <div class="modal">
      Укажите причину изменения состава заявки:
      <textarea style="width:98.5%; height:100px;"></textarea>
      <div class="row">
        <div class="span12 text-right" style = "float:right">
          <a href="javascript:;" class="save-and-close btn btn-info">Сохранить</a>
          <a href="javascript:;" class="close-form btn btn-default">Отменить</a>
        </div>
      </div>
    </div>
  </div>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА  СПИСКА ДАННЫХ CRM-->
<script id="orderTableItemTemplate" type="text/template">
<tr>
      <td colspan="15"  style = "height:40px;"><span class = "lbl_header">Заявка №<%=number%><%= (state=='wait')?'&nbsp<span class="wait-state"><small style="font-size: 10px;color: gray;display: inline-block;">(В ожидании, <a style="cursor:pointer" class="client-card-public">в работу</a>)</small></span>':'' %></span></td>
</tr>
<tr class="order-projects">
<td colspan="5"><%= obj.client_group?('Группа: [<a href="/crm#orders/&managers=0&cl=all&o=all&c=total&m=&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off&gr='+ obj.client_group  +'" style="font-weight:bold">'+obj.client_group+'</a>]&nbsp;&nbsp;'):'' %>
        </td>
  <td colspan="7">Проекты заказчика:<br/>
    <% if(obj.projects && projects.length>0){%>
      <% for(var i in projects) {%>
        <%= (i==0)?'':',' %>
        <!--<a href="/crm#orders/&project=<%= projects[i]['project_id'] %>"><%= projects[i].project_name %></a>-->
        <a href="/projects#search/<%= projects[i]['project_id'] %>"><%= projects[i].project_name %></a>
      <% } %>
    <%} else{%>
      &#8212;
    <%}%>
  </td>
  <td colspan = "3">
    Менеджер:&nbsp;<a class="manager-link" href="mailto:<%= manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[manager] %></a>
  </td>
</tr>
<tr class="order-head">
      <td colspan="5">
          <a href="/client-card/<%= client_id %>" class="client-card-lnk font18"><%= client %></a><br/>
          <% if(window.client_abc) {%>
            <span title='Текущая категория по подписанным договорам' style = "font-weight:bold; font-size: 12px;">Категория:
            <% if(window.client_abc.price.is_a) {%>
              &nbsp;А по р.
            <% } else %>
            <% if(window.client_abc.price.is_c) { %>
              &nbsp;С по р.
            <% } else if(!window.client_abc.price.is_c && !window.client_abc.price.is_a){%>
              &nbsp;B по р.
            <%} %>
            <% if(window.client_abc.square.is_a) {%>
              &nbsp;A по м2.
            <% } else %>
            <% if(window.client_abc.square.is_c) {%>
              &nbsp;C по м2.
            <% } else if(!window.client_abc.square.is_c && !window.client_abc.square.is_a) {%>
              &nbsp;B по м2.
            <% } %>
            </span>
          <% } %>

          <a href="/app#orders/&cl=<%= client_id %>&o=all&c=total&m=&t=all&r=all&od=all&cd=all&ch=all&s=400&ts=order&sc=no&p=1&i=0&fa=off" class="by-client" data-client="<%= client_id %>" data-name="<%= client %>" style = "font-size: 12px;">Всего заявок: <%= window.clientcnt %></a>

          <div style = "font-size:11px; line-height:120%!important;"><%= client_info.replace('<br>','<br>') %></div>
      </td>
      <td colspan="7" style = "width:100%">
          <a href="javascript:;" class="order-structure-lnk font12"><%= structure %></a>
      </td>



      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' >Площадь, м2</span><br/>
          <span style = 'font-size:16px;' class="<%= approx_sq %>-approx"><strong><%= $.number( sq, 2, ',', ' ' ) %> </strong></span><br/><br/>
          <span style = 'font-size:12px; font-weight: bold; ' >&nbsp;
            <% if(obj.abc_type){
                if(abc_type.square.is_a) {%>
                  Категория А
                <% } else %>
                <% if(abc_type.square.is_c) { %>
                  Категория С
                <% } else if(!abc_type.square.is_c && !abc_type.square.is_a){%>
                  Категория B
                <%}
            }%>
          </span>
      </td>
      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' >Ср. за м2, руб.</span><br/>
          <span style = 'font-size:16px;' class="<%= approx_sq %>-approx"><strong>&nbsp;<%= Routine.priceToStr( (sq>0)?(price/sq):0, '', ' ') %> </strong></span><br/><br/>
          <span style = 'font-size:10px; ' >&nbsp;</span>
      </td>
      <td align="right" class = "nowrap left-border">
          <span style = 'font-size:10px;' >Стоимость, руб.</span><br/>
          <span style = 'font-size:16px;' class="<%= approx %>-approx"><strong><%= Routine.priceToStr( price, '', ' ') %> <span title = "В цену включены доп. позиции"><%=(products && products.length>0 && services && services.length>0)?'*':''%></span></strong></span><br/>
          <span style = 'font-size:11px; float: left;'>Наценка: <%=markup>0?markup.toString().replace('.',',')+'%':'-'%> </span><br/>

          <span style = 'font-size:12px; font-weight: bold; ' >&nbsp;
              <% if(obj.abc_type){
                if(abc_type.price.is_a) {%>
                  Категория А
                <% } else %>
                <% if(abc_type.price.is_c) { %>
                  Категория С
                <% } else if(!abc_type.price.is_c && !abc_type.price.is_a){%>
                  Категория B
                <%}
              }%>
          </span>
      </td>

</tr>
<tr class="order-details collapsed">
      <%   var fac = [];
            var contracts_nums = [];
            for(var q in obj.contracts){
              if(obj.contracts[q]['factory'] && fac.indexOf(obj.contracts[q]['factory'])<0)
                fac.push(obj.contracts[q]['factory'].substring(0,1).toUpperCase());
              contracts_nums.push(obj.contracts[q]['number']);
            } %>
      <td class="nowrap flex">
        <div class="up" title="Активность Общая (АО)"><%=activity%></div>
        <div class="down" title="Активность значимая (АЗ)"><%=activity_significant%></div>
        <div class="down" title="АЗ / АО"><%=activity_percent%></div>
      </td>
      <td class = "nowrap" align="left" >
          <div class = "condition-date"><%= Routine.smartDateStr(f_state_date)%></div><%= f_state_initiator+': '+window.DICTS[f_state] %>
          <br>
          <a class="manager-link" href="mailto:<%= f_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[f_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;"><span style = "font-size:14px;">→</span><%= (prelast_days_count && prelast_days_count>0 )?prelast_days_count:0%><span style = "font-size:14px">→</span>
      </td>
      <td class = "nowrap" align="left" ><div class = "condition-date"><%= Routine.smartDateStr(prelast_state_date)%></div><%= prelast_state_initiator+': '+window.DICTS[prelast_state] %>
        <br>
        <a class="manager-link" href="mailto:<%= prelast_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[prelast_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;" title="дней между предпоследним и последним (всего дней, от первого до последнего)."><span style = "font-size:14px">→</span><%= (last_days_count)?(last_days_count-(prelast_days_count?prelast_days_count:0)  ):0 %>(<%= (last_days_count )?last_days_count:0%>)<span style = "font-size:14px">→</span>
      </td>
      <td class="order-current-status nowrap" ><strong><div class = "condition-date"><%= Routine.smartDateStr(l_state_date) %></div><a href="javascript:;" class="order-history-lnk"><%= l_state_initiator+': '+window.DICTS[condition] %></a></strong><%= ((condition==window.ORDER_CONDITIONS['REFUSE'] || condition ==window.ORDER_CONDITIONS['EXAMINE'] || condition==window.ORDER_CONDITIONS['INTEREST']) && l_state_reason != '' )? '<br/>'+l_state_reason:'' %>
        <br>
        <a class="manager-link" href="mailto:<%= l_state_manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.MANAGERS[l_state_manager] %></a>
      </td>
      <td class = "nowrap" style = "text-align:center;" title="количество дней между последним состоянием и текущей датой(количество дней между первым состоянием и текущей датой)."><span style = "font-size:14px">→</span><%= Routine.daysDiff(new Date(),Routine.parseDateTime(l_state_date,"dd.mm.yyyy h:i:s")) %>(<%= Routine.daysDiff(new Date(),Routine.parseDateTime(f_state_date,"dd.mm.yyyy h:i:s"))  %>)<span style = "font-size:14px">→</span>
      </td>

      <td class = "nowrap" style = "text-align:center;"><span style = "font-size:14px; ">→</span><span style ="<%=((close_days_count || close_days_count===0) && !cur_close_date)?'text-decoration:line-through':''%>"><%= close_days_count || close_days_count===0?close_days_count:'?' %></span><span style = "font-size:14px">→</span></td>

      <td class = "nowrap <%=chance>50 && !cur_close_date && condition_type!='закрывающее' ?'error':'blue-condition'%> <%=last_close_date && last_close_date!='' && Routine.parseDate(last_close_date, 'dd.mm.yyyy' ) < new Date() && condition_type!='закрывающее' ? 'error1': '' %> " ><div  class = "condition-date" style = "<%=(last_close_date!=""&& !cur_close_date)?'text-decoration:line-through':''%> <%=(confirmed_by_client)?'font-weight:bold':''%>"><%= last_close_date!=""?Routine.smartDateStr(last_close_date):'?' %></div>Договор
         <% for(var q in contracts_nums) { %>
            <%= (q>0)?",":"" %>
            <span><%= contracts_nums[q] %></span>
          <% } %>
      </td>
      <td class = "nowrap <%=last_finish_date && Routine.parseDate(last_finish_date, 'dd.mm.yyyy' ) < new Date() && condition_type!='закрывающее' ? 'error1': '' %>"  >
        <div  class = "condition-date  " style = "<%=( last_finish_date!='' && !cur_finish_date)?'text-decoration:line-through':''%> <%=(finish_confirmed_by_client)?'font-weight:bold':''%>">
          <%= last_finish_date?Routine.smartDateStr(last_finish_date):'?' %>
        </div>Сдача
      </td>
      <td class = "nowrap" style = "width:100%;"><span class = "<%= chance_str.toString().indexOf('(-')>-1?'show-chance-str':''%>  "><strong><%= chance_str!="—" && chance_str!=undefined?chance_str +' %' :'?' %></strong></span></td>
      <td align="left" class = "nowrap">
        <span title="Завод">
          <%= (fac.length>0)? fac.join(", "):"–" %>
        </span>
      </td>
      <!--
      <td align="right" class = "nowrap"></td>
      <td align="right" class = "nowrap">Задачи:</td>
      -->
      <td colspan = "3" align="right" class = "nowrap1"><a href="javascript:;" class="show-tasks-lnk"><%= Routine.smartDateStr(task_date) %><br/><%= task %></a></td>
</tr>
<tr class="order-foot">
      <td colspan="3" style = "font-size:11px;">
        <a href="javascript:;" data-status="<%= favorite %>" class="client-card-favorite fa fa-star<%= favorite=='on'?'':'-o' %>"></a>
      </td>
      <td colspan="9" style = "vertical-align:top"><em><%= Routine.commentFormat(comment) %></em></td>
      <td colspan="3" style = "font-size:11px; text-align:right;vertical-align:top">
        <% var ha = true;
           if(glCurUser.admin!='admin'){
              for(var r=0;r<glCurUser.roles.length;++r){
                var role = glCurUser.roles[r];
                for(var p in role.pages){
                if(p=='app'){
                  if(role.pages[p]['additional'] && (role.pages[p]['additional'].type=='onlymy' || role.pages[p]['additional'].type=='shared')){
                    ha = false;
                  }
                }
              }
           }
           } %>

          <%if(documents)
            {
              if(documents['status'] == 'ok'){%>
                <span class = "lnk lnk-google-docs" title = "Перейти к документам"><i class="fa fa-folder"></i>&nbsp;Документы</span>
              <%}
              else if(documents['status'] == 'in_process'){%>
                <span class = "lnk lnk-google-docs" title = "Создаются"><i class="fa fa-circle-o-notch fa-spin"></i>&nbsp;В процессе...</span>
              <%}
              else if(documents['status'] == 'error'){%>
                  <span class = "lnk lnk-google-docs" title = "Ошибка создания документов. <%=Routine.stripTags(documents['note'])%>" >
                  <i class="fa fa-warning"></i>&nbsp;Ошибка</span>
              <%}}else{%>
              <span class = "lnk lnk-google-docs" title = "Создать"><i class="fa fa-folder-o"></i>&nbsp;Документы</span>
        <% } %>
      </td>
</tr>
<tr>
      <td colspan="15" class="h20">&nbsp;</td>
</tr>
</script>

<script id="productTableTemplate" type="text/template">
  <div class="line-header" style = "margin-bottom:30px;">
      <span class = "lbl_header">Состав</span>
  </div>
  <div class="row">
    <div class="span6">
      <div class="form-inline">
      <label>Адрес доставки<br />
      <input type="text" value="<%= total_address %>" class="total-address span6" /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Стоимость доставки (руб)<br />
        <input value="<%= total_delivery %>" type="text" class="total-delivery span2" /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
      </label>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Монтаж (руб)<br />
        <input value="<%= total_montaz %>" type="text" class="total-montaz span2" /></label>
        <label><input type="checkbox" class="total-shef-montaz"> Шеф-монтаж</label>
      </div>
      <em>Оставить пустым, если разный монтаж</em>
      </label>
    </div>
    <div class="span3">
      <div class="form-inline">
        <label>Наценка, %<br />
        <input value="<%= markup.toString().replace('.',',') %>" type="text" class="markup span2" /></label>
      </div>
      <!--<em>Оставить пустым, если разная наценка</em>-->
      </label>
    </div>
  </div>
  <div class="row row-collapsible" style="position: relative">
    <fieldset class="collapsible">
    <div class="linked-orders" data-id="">
        <input type="text" class="linked-order-list" />
        <div class="btn btn-info fa fa-save save-linked-orders"></div>
    </div>
    <legend>Основные позиции</legend>
    <table class="table span10 products-table" style = "width:95%;">
      <caption class="text-left"></caption>
      <thead>
        <tr>
          <th><strong>Назначение</strong></th>
          <th><strong>Тип</strong></th>
          <th><strong>Кол-во (ед.)</strong></th>
          <th><strong>Площадь общая (кв.м)</strong></th>
          <th><strong>Стоимость товара (руб.)</strong></th>
          <th><strong>Стоимость доставки (руб.)</strong></th>
          <th><strong>Стоимость монтажа (руб.)</strong></th>
          <th><strong>Стоимость общая (руб.)</strong></th>
        </tr>
      </thead>
      <tfoot>
          <tr>
            <td></td>
            <td class="text-right"><strong>Итого:</strong></td>
            <td><span class="total-num"></span></td>
            <td><span class="total-sq"></span></td>
            <td><span class="total-price-goods"></span></td>
            <td><span class="total-price-delivery"></span></td>
            <td><span class="total-price-montag"></span></td>
            <td><span class="total-price" style="font-weight:bold;"></span></td>
          </tr>
      </tfoot>
      <tbody></tbody>
    </table>
    <div class="span2"></div>
    <div class="row" style="width:100%">
        <div class="span7 text-right" style = "float:right">
          <a href="javascript:;" class="add-new-position btn btn-warning"><span>+</span> Добавить позицию</a>
        </div>
    </div>
    </fieldset>
  </div>
  <div class="row row-collapsible">
  <fieldset class="collapsible" style="margin-bottom:20px">
  <legend>Доп. позиции</legend>

  <div class="row" style = "padding-top:40px;">
    <div class="control-group span12" style="width:100%; margin-left:30px;">
        Любые товары и услуг, не относящиеся к основной продукции. <em style="font-size:inherit;">Например, монтаж, демонтаж, котельная, наружные сети, рабочая документация и т.п.</em>
    </div>
    <% if(services && services.length>0) { %>
    <table class="table span10 services-table" style = "width:95%; margin-top:10px;">
      <caption class="text-left"></caption>
      <thead>
        <tr>
          <th><strong>Название</strong></th>
          <th><strong>Тип</strong></th>
          <th><strong>Цена (руб.)</strong></th>
          <th><strong>Продукция</strong></th>
        </tr>
      </thead>
      <tfoot>
          <tr>
            <td></td>
            <td class="text-right"><strong>Итого:</strong></td>
            <td><span class="serv-total-price"></span></td>
            <td></td>
          </tr>
      </tfoot>
      <tbody>

      </tbody>
    </table>
      <div class="span2"></div>
      <% } %>
  </div>

  <div class="row" style = "width:100%">
  <div class="span12 text-right" style="float:right;">
  </div>
  </div>
  <div class="row" style = "width:100%">
    <div class="span6 text-right" style = "float:right">
      <a href="javascript:;" class="add-new-service btn btn-warning"><span>+</span> Добавить доп. позицию</a>
    </div>
  </div>
  </fieldset>
  </div>
  <div class="row" style = "margin-bottom:25px; width:100%">
    <div class="span6 total-money">Общая стоимость заявки: <span class="<%= approx %>-approx"></span> руб.</div>
  </div>
  <div class="row row-collapsible">
    <fieldset class="collapsible">
      <legend>Проекты заказчика</legend>
      <div class="form-horizontal customer-project-block" style="margin-top:40px;">
        <div class="control-group span12" style="width:100%;">
          <div class="span12 projects-list-container" style="position:relative;">
            <input type="text" class="projects-list" />
          </div>
        </div>
      </div>
    </fieldset>
  </div>
  <div class="row">
  <div class="span5">
        <div class="controls">
          <label>Поиск похожих заявок</label>
          <select multiple class="span4 like-props">
              <option value="1">Площадь</option>
              <option value="2">Адрес доставки</option>
              <option value="3">Назначение продукции</option>
          </select>&nbsp;<button class="find-like btn">Найти</button>
        </div>
    </div>
    <div class="span4 text-right" style = "float:right;margin-top: 22px;margin-right: 10px;margin-left:-20px">
         &nbsp;Тендер
        <select class="is-tender" style="width: auto;">
            <option value="no"<%= (is_tender=='no')?' selected':'' %> >нет</option>
            <option value="unknown"<%= (is_tender=='unknown')?' selected':'' %> >неизвестно</option>
            <option value="we-open"<%= (is_tender=='we-open')?' selected':'' %> >участвуем мы, открытый</option>
            <option value="we-closed"<%= (is_tender=='we-closed')?' selected':'' %> >участвуем мы, закрытый</option>
            <option value="they-open"<%= (is_tender=='they-open')?' selected':'' %> >участвует клиент, открытый</option>
            <option value="they-closed"<%= (is_tender=='they-closed')?' selected':'' %> >участвуем клиент, закрытый</option>
        </select>
    </div>

    <div class="span5 text-right correspondent-block" style="float:right;margin-top: 22px;margin-right: 10px;">
    </div>

  </div>
  </div>
  <div class="row" style="width:100%">
    <div class="span7 text-right" style = "float:right">
      <a href="javascript:;" class="save-and-close btn btn-info">Сохранить</a>
    </div>
</div>
  <div class="row">
    <div class="span12" style = 'margin-top:40px;'>
      <div class="similar-list"></div>
    </div>
  </div>
  <div class="row">
    <div class="span12">
    <a class="quick-enter btn" href="javascript:;">Быстрый ввод</a>
    </div>
  </div>
</script>

<script id="correspondentTemplate" type="text/template">
<div class="controls">
    <div id="correspondent-dropdown" style="<% if(!need_display) { %>display:none;<% } %>position:relative">
        &nbsp;Заказчик&nbsp;тендера
        <input type="text" id="correspondent" autocomplete="off" placeholder="Заказчик тендера" style="margin:0" value="<%=(correspondent)?Routine.trim(correspondent).replace(/\"/g,'&quot;'):''%>" />
    <div id="cor-exists" class="alert alert-warning hide">
        Введённое название существует в БД. Установить связь?&nbsp;&nbsp;<a id="select-corr" class="btn" href="javascript:;">Выбрать</a>
    </div>
    <ul id="corr-dropdown-menu" class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu"></ul>
</div>
</script>

<script id="serviceEditForm" type="text/template">
  <div class="span12 service-edit-form">
    <div class="row">
      <div class="span3">
        <label>Название:</label>
      </div>
      <div class="span7">
        <input type="text" value="<%= name.replace(/"/g, '&quot;') %>"  class="construction-name" style="width:100%;" />
      </div>
    </div>
    <div class="row">
      <div class="span3">
        <label>Тип:<br />
          <select class="service-type">
            %type = [i for i in dicts if i['type'] == 9]
            %for row in type:
              <option value="{{row['name']}}">{{row['name']}}</option>
            %end
          </select>
        </label>
      </div>
      <div class="span2">
        <label>Цена (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" <%= (product_include=='yes')?'disabled':'' %> class="construction-price"></label>
      </div>
      <div class="span3">
        <br />
        <label class="checkbox"><input type="checkbox" class="is_approx" <%= (approx=='yes')?'checked':'' %>>Цена ориентировочная</label>
      </div>
      <div class="span4">
        <br />
        <label class="checkbox"><input type="checkbox" class="isinclude_product" <%= (product_include=='yes')?'checked':'' %> >Цена включена в стоимость товара</label>
      </div>
    </div>
    <div class="row">
       <div class="form-inline">
        <label class="checkbox"><input type="checkbox" class="by_production" <%= by_production?'checked':'' %> />для определенной продукции</label>
      </div>
    </div>
    <div class="productions-table row" style="<%= (!by_production)?'display:none;':'' %>">
      <div class="pr-header ">
        <span class="span1">№</span>
        <span class="span11">Наименование</span>
      </div>
      <% for(var i in productions) { %>
        <div class="pr-line">
          <span class="span1"><%= productions[i].number %></span>
          <div class="span11">
            <span class="title"><%= productions[i].name %></span>
            <div class="units form-inline">
              <label class="checkbox"><input type="checkbox" class="payment-all-units" /> <b>Все</b></label>&nbsp;
              <% for(var j=0;j<productions[i].count;++j) {%>
                <% var is_chk = false; for(var u in units) if(units[u].production_id==productions[i]._id && units[u].unit_number==(j+1)) is_chk=true; %>
                <label class="checkbox"><input type="checkbox" data-production="<%= productions[i]._id %>" data-number="<%= (j+1) %>" <%= is_chk?'checked':'' %> /> <%= (j+1) %></label>&nbsp;
              <% } %>
            </div>
          </div>
        </div>
      <% } %>
    </div>
      <div class="row" style="padding-top:20px">
        <label>Примечание:</label>
        <textarea class="construction-note" style="width:945px"><%= note %></textarea>
      </div>
     <div class="row">
        <div class="span12 text-right">
          <a href="javascript:;" class="btn btn-success save-position">Применить и закрыть</a>
          <a href="javascript:;" class="btn btn-info save-add-position">Применить и добавить сл.</a>
          <a href="javascript:;" class="btn btn-danger remove-position <%= (is_new)?'hide':'' %>">Удалить</a>
          <a href="javascript:;" class="btn close-position">Закрыть</a>
        </div>
      </div>

  </div>
</script>

<script id="serviceTableItemTemplate" type="text/template">
  <td><a class="show-position" href="javascript:;"><%= name %></a></td>
  <td><%= type?type:"Неизвестно" %></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td>
    <% if(!by_production) { %>
          (вся продукция)
    <% } else { %>
      <% /*группируем юниты по продукции */ %>
      <% var prod_gr = {}; %>
      <% for(var i in units) { %>
            <% var u = units[i]; %>
            <% if(u.production_id in prod_gr)
                prod_gr[u.production_id].push(u.unit_number);
              else prod_gr[u.production_id] = [u.unit_number]; %>
          <% } %>
          <% /* выводим группы */ %>
          <% for(var i in prod_gr) { %>
             <% for(var j in productions) { %>
               <% if(productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <div class="line">
              Ед. продукции:
              <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
             </div>
          <% } %>
    <% } %>
  </td>
</script>

<script id="productTableItemTemplate" type="text/template">
  <td><span title="Связать с другими заявками" class="fa fa-link product-links<% if(linked_orders.length > 0) { %> filled<% } %>"></span><%= name %></td>
  <td><a class="show-position" href="javascript:;"><%= type %></a></td>
  <td><%= count %></td>
  <% var delivery = 0; var montag = 0;
     for(var p in obj.positions) {
      delivery+=Routine.strToFloat(obj.positions[p].delivery||0);
      montag+=Routine.strToFloat(obj.positions[p].mont_price||0)*(obj.positions[p].mont_price_type?1:parseInt(obj.positions[p]['num']));
     }%>
  <td><span class="<%= approx_sq %>-approx"><%= $.number( sq*count, 2, ',', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price*count, '', ' ') %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( delivery, '', ' ') %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( montag, '', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price*count+delivery+montag, '', ' ' ) %></span></td>
</script>

<script id="positionTableTemplate" type="text/template">
<div class="span12">
  <div class="row">
    <div class="span3">
      %target = [i for i in dicts if i['type'] == 5]
      %trgs = []
      %for row in target:
          %trgs.append(row['name'])
      %end
       <label>Назначение:<br />
       <input
              autocomplete="off"
              data-source="{{json.dumps(trgs)}}"
              class="constuction-target"
              value="<%= name %>"
              type="text">
      </label>
    </div>
    <div class="span2">
      <label>Тип:<br /><select class="construction-type">
            %type = [i for i in dicts if i['type'] == 4]
              %for row in type:
                <option value="{{row['name']}}">{{row['name']}}</option>
              %end
        </select>
      </label>
    </div>
    <div class="span2">
      <label>Цена за ед. (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" class="construction-price"></label>
      <label><input type="checkbox" class="isapprox"> Ориентировочная</label>
    </div>
    <div class="span2">
      <label>Площадь ед. (кв.м):<br /><input type="text" value="<%= sq.toString().replace('.',',') %>" class="construction-sq"></label>
      <label><input type="checkbox" class="isapprox-sq"> Ориентировочная</label>
    </div>
    <div class="span3">
      <label class="gabar">Габариты (м):</label>
        <input type="text" value="<%= length %>" placeholder="Д" class="construction-length span1">
        <input type="text" value="<%= width %>" placeholder="Ш" class="construction-width span1">
        <input type="text" value="<%= height %>" placeholder="В" class="construction-height span1">
    </div>
  </div>
  <div class="row">
    <div class="span5">

    </div>
    <div class="span7 form-inline">

    </div>
  </div>
   <div class="row">
    <div class="span12">
      <label class="checkbox"><input type="checkbox" class="is_complect" <%= is_complect?"checked":'' %> />Комплект</label>
    </div>
  </div>
  <div class="row">
    <hr class="span12" style="margin-top:0px;">
  </div>
  <div class="row">
          <div class="span1"><strong>Кол-во ед.*</strong></div>
          <div class="span4"><strong>Адрес доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
          <div class="span3"><strong>Стоимость доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
          <div class="span3"><strong>Монтаж</strong><br><em>Оставить пустым, если монтаж не требуется или монтаж общий</em></div>
          <div class="span1"></div>
  </div>
  <div class="products-table"></div>
  <div class="row">
    <div class="span12">
      * если "Комплект" ввести кол-во штук в комплекте
    </div>
    <div class="span12 text-right bottom-spance">
      <a href="javascript:;" class="btn add-addr">Добавить адрес</a>
    </div>
  </div>
  <div class="row">
    <h3 class="span12">Итого</h3>
  </div>
  <div class="row" style = "width:100%">
    <div class="span6">
      <div class="row">
        <div class="span3 text-right">Стоимость товара: </div>
        <div class="span3"><span class="pos-total-price"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Стоимость монтажа: </div>
        <div class="span3"><span class="pos-total-montaz"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Стоимость доставки: </div>
        <div class="span3"><span class="pos-total-delivery"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Всего: </div>
        <div class="span3"><span class="pos-total-all"></span></div>
      </div>
    </div>
    <div class="span6">
      <div class="row">
        <div class="span3 text-right">Площадь: </div>
        <div class="span3"><span class="pos-total-sq"></span></div>
      </div>
      <div class="row">
        <div class="span3 text-right">Цена за кв.м.: </div>
        <div class="span3"><span class="pos-total-kvm"></span></div>
      </div>
    </div>

  </div>



  <div class="row">
    <div class="span12 text-right">
      <a href="javascript:;" class="btn btn-success save-position">Сохранить и закрыть</a>
      <a href="javascript:;" class="btn btn-info save-add-position">Сохранить и добавить сл.</a>
      <a href="javascript:;" class="btn btn-danger remove-position hide">Удалить позицию</a>
      <a href="javascript:;" class="btn close-position">Закрыть</a>
    </div>
  </div>
</div>
</script>

<script id="positionItemTemplate" type="text/template">
<div class="row">
  <div class="span1">
    <input type="text" value="<%= num %>" class="pos-number" >
  </div>
  <div class="span4">
    <input type="text" value="<%= addr %>" class="pos-addr" >
  </div>
  <div class="span3">
    <input type="text" value="<%= obj.delivery?Routine.priceToStr( delivery, '', ' '):'' %>" class="pos-delivery" >
  </div>
  <div class="span3">
    <div class="input-prepend">
      <input type="text" value="<%= Routine.priceToStr( mont_price, '', ' ') %>" class="mont-price" style="margin-right: -1px; display: inline-block; border-radius: 4px 0 0 4px; width:90px;" >
      <select style="width:120px;" class="mont_type" disabled>
        <option value="0" <%= obj.mont_price_type?'':'selected' %> >за единицу</option>
        <option value="1" <%= obj.mont_price_type?'selected':'' %>>за все единицы</option>
      </select>
    </div>
    <label class="checkbox"><input type="checkbox" <%= shmontcheck %> class="pos-shmont"> Шеф-монтаж</label>
  </div>
  <div class="span1">
  <a class="remove-addr" href="javascript:;">&times;</a>
  </div>
</div>
</script>

<script id="historyTableTemplate" type="text/template">

<div class="line-header" style = "margin-bottom:30px;">
      <span class = "lbl_header">История состояний</span>
  </div>

  % if order_condition != '51ed3f738fe17600027069b5':
  <div class="row enter-history">
    <div class="span4">
      <div class="control-group">
        <label class="control-label" >Состояние:</label>
        <div class="controls">
          <select class="span4 condition-select">
              %cond = [i for i in dicts if i['type'] == 3]
              %for row in cond:
                <option data-price="{{row['price']}}" data-structure="{{row['structure']}}"  data-sq="{{row['sq'] if 'sq' in row else 'disabled'}}" data-property="{{row['property']}}" value="{{row['_id']}}" {{ 'style=display:none' if (row['name']==orders_conditions['CONTRACT_SIGN']) else '' }} >{{row['name']}}</option>
              %end
          </select>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label" style="display:inline-block;">Инициатор контакта:</label>
        <div class="controls" style="display:inline-block;">
          <label class="radio" style="display:inline-block;"><input type="radio" name="initiator-contract" value="we" />Мы</label>&nbsp;&nbsp;&nbsp;
          <label class="radio" style="display:inline-block;"><input type="radio" name="initiator-contract" value="they" />Они</label>
        </div>
      </div>
       <div class="control-group">
        <label class="control-label" style="display:inline-block;">Конт. лицо:</label>
        <div class="controls" style="display:inline-block;">
              &nbsp;
              <a href="javascript:;" class="refresh-contacts"><i class="fa fa-refresh"></i></a>
              &nbsp;
              <a href="/client-card/<%= client_id %>" target="_newtab" class="goto-contacts"><i class="fa fa-users"></i></a>
        </div>
        <select style="width:100%;" class="client-contacts" data-val=''></select>
      </div>
        <div class="control-group">
        <label class="control-label" >Вероятность заказа: <strong class="chance-value">Не определена</strong></label>
        <div class="controls">
          <input type="text" class="span4 chance-slider" data-slider-min="0" data-slider-tooltip="hide" data-slider-max="100" data-slider-step="10" data-slider-value="0" >
        </div>
      </div>

    </div>
    <div class="span10" style="float:right;">
      <div class="control-group hideme otkaz-block">
        <label class="control-label" >Причина отказа:</label>
        <div class="controls">
          <select class="span4 otkaz-select">
          <option value="0">Укажите причину</option>
          %cond = [i for i in dicts if i['type'] == 7 and i['name'] != 'Автозакрытие']
              %for row in cond:
                <option value="{{row['name']}}">{{row['name']}}</option>
              %end
          </select>
        </div>
      </div>
      <div class="control-group hideme review-block">
        <label class="control-label" >Причина:</label>
        <div class="controls">
          <select class="span4 review-select">
          <option value="0">Укажите причину</option>
          <% _(window.DICTS.review).each(function(row) { %>
              <option value="<%= row %>"><%= row %></option>
          <% }); %>
          </select>
        </div>
      </div>
       <div class="control-group hideme interes-block">
        <label class="control-label" >Вид интереса:</label>
        <div class="controls">
          <select class="span4 interes-select">
          <option value="0">Укажите вид интереса</option>
          <% _(window.DICTS.interests).each(function(row) { %>
              <option value="<%= row %>"><%= row %></option>
          <% }); %>
            <option value="Другое">Другое</option>
            <option value="Бесперспективный клиент">Бесперспективный клиент</option>
          </select>
        </div>
      </div>

      <div class="control-group hideme contract-link-block" style="float:left; width:100%;">
        <% /* <label class="radio"><input type="radio" checked name="contract-link-vaiant" value="create" />Создать новый договор</label> */ %>
        <label class="radio" style="float:left; margin:7px 10px 0 0;"><input type="radio" checked value="choose" name="contract-link-vaiant" />Привязать к существующему договору</label>&nbsp;&nbsp;<div class="contract-number-block" style="float:left;z-index:9999;" >
        <input placeholder="Номер договора" class="contract-number" type="text" /></div>
      </div>

      <div class="control-group">
        <label class="control-label" >Примечание:</label>
        <div class="controls">
          <textarea class="span10 comment-text" rows="5" ></textarea>
        </div>
      </div>
    </div>
  </div>


  <div class="row" style = "margin-top:10px;">
    <div class="span12" style = "margin-top: 20px;  border: dashed 1px #aaa;  padding: 10px;  width: 600px;">
      <!--==Finish date==-->
      <div class="control-group" style = "width:300px; float: left;">
        <label class="control-label" >Дата сдачи объекта:</label>
        <div class="controls">
          <label class="control-label" style = "padding-bottom:5px; width:130px; "><input class = "cb-nofinish-date" type = "checkbox" <%= (!cur_finish_date)?"checked":""%>  /> <span style = "color:#777;">не определена</span></label>
          <input type="text" readonly class="span2 finish-date" style = "<%= (!cur_finish_date)?'display:none':''%>"  value="<%=cur_finish_date%>"/>
          <a href="javascript:;" class="change-finish-date" data-date="" data-date-format="dd.mm.yyyy" style = "<%= (!cur_finish_date)?'display:none':''%>">
              <span class="add-on"><i class="icon-calendar"></i></span>
          </a>
          <div style = "display: none">
            <label class="control-label lbl-finish-confirmed-by-client" style = "padding-top:5px; width:200px; <%= (!cur_finish_date)?'display:none':''%>"><input class = "cb-finish-confirmed-by-client" type = "checkbox" <%= (finish_confirmed_by_client)?"checked":""%>  /> <span style = "color:#777;">подтверждена клиентом</span></label>
          </div>
        </div>
      </div>
      <!--==Close date==-->
      <div class="control-group" style = "width:300px; float: left;">
        <label class="control-label" >Дата подписания договора: </label>
        <div class="controls">
        <label class="control-label" style = "padding-bottom:5px; width:130px; "><input class = "cb-noclose-date" type = "checkbox" <%= (!cur_close_date)?"checked":""%>  /> <span style = "color:#777;">не определена</span></label>
        <input type="text" readonly class="span2 close-date" style = "<%= (!cur_close_date)?'display:none':''%>"  value="<%=cur_close_date%>"/>
        <a href="javascript:;" class="change-close-date" data-date="" data-date-format="dd.mm.yyyy" style = "<%= (!cur_close_date)?'display:none':''%>">
            <span class="add-on"><i class="icon-calendar"></i></span>
        </a>
        <label class="control-label lbl-confirmed-by-client" style = "padding-top:5px; width:200px; <%= (!cur_close_date)?'display:none':''%>"><input class = "cb-confirmed-by-client" type = "checkbox" <%= (confirmed_by_client)?"checked":""%>  /> <span style = "color:#777;">подтверждена клиентом</span></label>
        </div>
      </div>
      <!--===-->
    </div>
  </div>

  <div class="row" style = "margin-top:10px;">
    <div class="span12">
      <div class="alert dogovor-block" style="display:none; margin:0px;">
        <b class="fa fa-exclamation-triangle"></b>&nbsp;<span>Будет создан договор</span>
      </div>
      <div class="alert perfect-price-alert" style="display:none;margin:0px;">
      <b class="fa fa-exclamation-triangle"></b>&nbsp;<span></span>&nbsp;&nbsp;
      <a class="btn btn-danger check-price-ok" href="javascript:;">ОК</a> <a class="btn check-price-cancel" href="javascript:;">отмена</a>
      </div>
      <div class="alert close-order-alert" style="display:none;margin:0px;">
      <b class="fa fa-exclamation-triangle"></b>&nbsp;<span>С таким состоянием заявка будет закрыта. Продолжить?</span>&nbsp;&nbsp;<a class="btn btn-danger save-history-ok" href="javascript:;">Да</a> <a class="btn save-history-cancel" href="javascript:;">нет</a>
      </div>
      <div class="alert chance-alert" style="display:none;margin:0px;">
      <b class="fa fa-exclamation-triangle"></b>&nbsp;<span>Вероятность не изменилась?</span>&nbsp;&nbsp;<a href="javascript:;" class="btn btn-success save-history-ok">Сохранить</a>
      <a href="javascript:;" class="btn close-history-any">Закрыть</a>
      </div>
      <div style = "margin-top:50px">
      <a href="javascript:;" class="btn btn-success save-history">Сохранить</a>
      <a href="javascript:;" class="btn close-history">Закрыть</a>
    </div>
    </div>
  </div>
  % end

</div>

  <div class="row" style="padding-left:20px; margin-top:40px;">
    <table class="table history-table">
      <thead>
        <tr>
          <th><strong>Дата</strong></th>
          <th><strong>Состояние</strong></th>
          <th><strong>Вероятность</strong></th>
          <th><strong>Закрытие</strong></th>
          <th><strong>Менеджер</strong></th>
          <th><strong>Инициатор</strong></th>
          <th><strong><nowrap>Конт.&nbsp;лицо</nowrap></strong></th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>

</script>

<script id="historyTableItemTemplate" type="text/template">
<tr>
<td class = "date"><%= getloc(datetime) %></td>
<td><%= window.DICTS[condition] %><%= reason !=''?': '+reason:'' %></td>
<td><%= (chance>0?chance+" %":"Не определена") %></td>
<td><%= (enddate)?enddate:'?' %></td>

<td>
  <a href="mailto:<%= manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.ALL_USERS[manager] %></a><br/>
</td>
<td style="text-align:center;"><%= (obj.initiator=='we')?'мы':((obj.initiator=='they')?'они':'') %></td>
<td style="white-space: normal; font-size:11px;"><%= contact !=''? contact :'' %> <%= ('client_name' in obj && client_name && client_name != 'undefined')?' ('+client_name+')':'' %></td>
</tr>
<tr>
    <td colspan="7" class="history-comment">
    <% for(var i in comments) {%>
      <div class="history-comment-elem" data-id="<%= comments[i]['_id'] %>">
        <span class="comment-head"><%= moment.utc(new Date(comments[i].date_add)).local().format("DD.MM.YYYY HH:mm") %>&nbsp;<a href="mailto:<%= comments[i].manager %>?subject=заявка <%= number %>" target = "_blank"><%= window.ALL_USERS[comments[i].manager] %></a></span>
        <span class="edit-comment-span" style = "font-style: italic;" data-text="<%= comments[i].text?escape(comments[i].text):''  %>"><%= Routine.commentFormat(Routine.rNToBr(comments[i].text)) %></span>

        <% if(glCurUser.admin=='admin' || comments[i].manager==MANAGER) { %>
          <a href="javascript:;" class="edit-comment" >редактировать</a>
        <% } %>
      </div>
    <% } %>

    <a href="javascript:;" class="add-comment">Добавить комментарий</a>
    </td>
</tr>
<tr>
    <td colspan="7">
      <% if(obj.firstcontact) { %>
          Первый контакт:  <%= obj.firstcontact %>

        <% } %>
    </td>
</tr>
</script>



<script id="taskTableTemplate" type="text/template">
<div class="line-header" style = "margin-bottom:30px;">
      <span class = "lbl_header">Задачи</span>
</div>
  <div class="row" style = "margin:0px;">
    <table class="table table-striped task-table">
      <thead>
        <tr>
          <th><strong>Дата</strong></th>
          <th><strong>Задача от</strong></th>
          <th><strong>Завершение</strong></th>
          <th><strong>Состояние</strong></th>
          <th><strong>Примечание</strong></th>
          <th><strong>Статус</strong></th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
  </div>
  <div class="row enter-task">
    <div class="span4">
      <div class="control-group">
        <label class="control-label" >Состояние:</label>
        <div class="controls">
          <select class="span4 task-select">
              %tsk = [i for i in dicts if i['type'] == 6]
              %for row in tsk:
                <option value="{{row['name']}}">{{row['name']}}</option>
              %end
          </select>
        </div>
      </div>

      <div class="control-group">
        <label class="control-label" >Завершение:</label>
        <div class="controls">
          <div class="input-append date datepickr"  data-date="01.10.2013" data-date-format="dd.mm.yyyy">
          <input class="span2" readonly size="16" type="text" value="01.10.2013">
          <span class="add-on"><i class="icon-calendar"></i></span>
          </div>
        </div>
      </div>

    </div>
    <div class="span10" style="float:right;">
      <div class="control-group">
        <label class="control-label" >Примечание:</label>
        <div class="controls">
          <textarea class="span10 task-comment-text" rows="5" ></textarea>
        </div>
      </div>
    </div>
  </div>
  <div class="row add-task-panel">
    <div class="text-right">
      <a href="javascript:;" class="btn btn-success save-task">Добавить задачу</a>
    </div>
  </div>
  <div style="display:none;" class="row confirm-task-panel">
  <div class="span9">Дата задачи превышает срок нахождения заявки в установленном состоянии.</div>
    <div class="text-right span3" style="float:right;">
      <a href="javascript:;" class="btn btn-warning save-task-confirm">Продолжить</a>
      <a href="javascript:;" class="btn save-task-cancel">Отмена</a>
    </div>
  </div>
</script>


<script id="taskTableItemTemplate" type="text/template">
<td><%= getloc(datetime) %></td>
<td><% if(manager) { %>
  <a href="mailto:<%= manager %>" target = "_blank"><%= window.ALL_USERS[manager] %></a>
  <% } %>
</td>
<td><%= closedatetime %> <a href="javascript:;"  style = "display: none;" class="change-date hide" data-date="<%= closedatetime %>" data-date-format="dd.mm.yyyy">изменить</a></td>
<td><%= condition %></td>
<td><%= comment %></td>
<td><span class="task-status" title = "<%=obj.finished_date?moment.utc(finished_date+'.000Z','DD.MM.YYYY HH:mm').local().format('DD.MM.YYYY HH:mm'):''%>"><%= status+ (obj.overdue?' (просрочена)':'') %></span><div class="status-block hide"><a href="javascript:;" class="ex-task">Отменить</a> <a href="javascript:;" class="comp-task">Завершить</a></div></td>
</script>





<script  id="likeItemTemplate" type="text/template">
<dt>Заявка № <a target="_blank" href="/crm/<%= number %>"><%= number %></a></dt>
<dd>
  <ul>
    <li>Первое состояние: <%= f_state %> (<%= f_state_date %>); последнее состояние: <%= l_state %> (<%= l_state_date %>)</li>
    <li>Состав заявки: <%= structure %></li>
    <li>Площадь: <%= $.number(sq, 2, ',', ' ' ) %></li>
    <li>Цена: <%= $.number(price, 2, ',', ' ' ) %></li>
    <li>Заказчик: <%= client %></li>
    <li>Контакты: <%= contacts %></li>
    <li>Менеджер: <%= window.ALL_USERS[manager] %> (<%= manager %>)</li>
  </ul>
</dd>
</script>

<script type="text/template" id="clientRolesTemplate">
  <div class="client-roles form-inline">
      <div class="line-header" style="margin-bottom:30px;">
        <span class="lbl_header">Роли клиента</span>
      </div>
      <table class="roles-list">
        <tr>
          <th style="width:20%"></th>
          <th style="width:40%">Контактное лицо</th>
          <th style="width:40%">Комментарий</th>
        </tr>
        <tr data-key="user">
          <td><label>Пользователь<a href="javascript:;" class="refresh-contacts"><i class="fa fa-refresh"></i></a></label></td>
          <td><select class="client-contacts"> </select> </td>
          <td><input type="text" class="cnt-note"  /></td>
        </tr>
        <tr data-key="interested">
          <td><label>Заинтересованный<a href="javascript:;" class="refresh-contacts"><i class="fa fa-refresh"></i></a></label></td>
          <td><select class="client-contacts"> </select> </td>
          <td><input type="text"  class="cnt-note" /></td>
        </tr>
        <tr data-key="conductor">
          <td><label>Проводник<a href="javascript:;" class="refresh-contacts"><i class="fa fa-refresh"></i></a></label></td>
          <td><select class="client-contacts"> </select> </td>
          <td><input type="text"  class="cnt-note" /></td>
        </tr>
        <tr data-key="boss">
          <td><label>Босс<a href="javascript:;" class="refresh-contacts"><i class="fa fa-refresh"></i></a></label></td>
          <td><select class="client-contacts"> </select> </td>
          <td><input type="text" class="cnt-note"  /></td>
        </tr>
      </table>
      <div class="full-description">
        <label>Примечание</label>
        <textarea><%= (obj && obj.note)?obj.note:'' %></textarea>
      </div>
      <div class="buttons text-right" style="margin-top:20px;">
        <button class="btn btn-primary btn-edit">Редактировать</button>
        <button class="btn btn-success btn-save hide">Сохранить</button>
        <button class="btn btn-danger btn-cancel hide">Отменить</button>
      </div>
  </div>
</script>
