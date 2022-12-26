%import json

%def scripts():
    <link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen">
    <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
    <script src="static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
    <script src="/static/scripts/select2.js?v={{version}}"></script>
    <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>

    <script src="static/scripts/factpayments/app.js?v={{version}}"></script>
    <script type="text/javascript">
      App.Models["CurrencyList"] = {{!currency_list}};
      App.glHasAccess = has_access('factpayments','o');
      App.initialize();
       $(function() {
        bootbox.setDefaults({locale: "ru",});
      });
    </script>
%end

%rebase master_page/base page_title='Фактические платежи', current_user=current_user, version=version, scripts=scripts,menu=menu

<style>
  .bootbox-confirm.modal{
      width:450px;
      margin-left:-225px;
      position: fixed;
    }
</style>

<link href="/static/css/contract.css?v={{version}}" rel="stylesheet" media="screen">

<div id="paymentsContainer">
    <div class="row hidden-print">
        <div class="span12">
            <div class="navbar">
                <div id="pnlContractFilter" class="navbar-inner" style="padding-top:10px">
                    <div class="input-prepend input-append">
                        <span class="add-on"><b class="icon-list-alt"></b></span>
                        <input type="text" class="filter-number" id="tbContractNumber" placeholder="введите номер договора">
                        <button id="btnContractFind" class="btn btn-primary btn-filter">Открыть</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div class="contract-edit" id="contractEditPnl">

    </div>
</div>

<div id="position-modal">
  <div id="position-modal-container" data-backdrop="static" class="modal hide" role="dialog" aria-hidden="true"></div>
</div>

<script id="contractEditTemplate" type="text/template">
  <form>
    <h1><%= parent_id?("Доп. соглашение №"+number):("Договор №"+number) %></h1>
    <div class="payments-list span12" style="float:left;">

    </div>
  </form>
</script>


<script id="paymentsTableTemplate" type="text/template">
  <div class="payments">
      <span class="empty" style="font-size:16px;">По данному договору нет плановых платежей.</span>
  </div>
</script>


<script id="paymentsDataTemplate" type="text/template">
  <div class="payment-data"  data-event_id="<%= current_event?current_event['_id']:'' %>">
    <div class="line">
        Срок платежа:
        <% if(period && date) {%>
          <% if(period=='by_period') { %>
            за период, <%= moment(date).format('DD.MM.YYYY') %> по <%= moment(date_end).format('DD.MM.YYYY') %> (план);
          <% } else if(period=='by_event') { %>
            по событию, <%= moment(date).format('DD.MM.YYYY') %> +<%= day_count %> <%= Routine.Declension(day_count,['день','дня','дней']) %> (план);
          <% } else { %>
            по дате, <%= moment(date).format('DD.MM.YYYY') %> (план);
          <% } %>
        <% } else { %>
          ----
        <% } %>
        <% if(current_event) { %>
          <%= moment(current_event.date_start).format('DD.MM.YYYY') %> (факт<%= (current_event.type=='additional_payment')?', доплата':'' %>)
        <% } %>
      </div>
      <div class="line">
        Размер: <%= Routine.priceToStr( size, '0,00', ' ' )  %> <%= obj.currency?obj.currency.name:"руб" %>. (план)
        <% if(current_event) { %> <%= Routine.priceToStr( current_event.size, '0,00', ' ' ) %>  <%= obj.currency?obj.currency.name:"руб" %>. (факт<%= (current_event.type=='additional_payment')?', доплата':'' %>) <% } %>
      </div>
      <div class="line">
        Назначение: <%= payment_use.name %>
        <% if(payment_use.code!=3) {%>
          <% if(!by_production) { %>
            (вся продукция)
            </div>
          <% } else { %>
            </div>
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
                 <% if(!productions[j].product_type && productions[j]._id==i) { %>
                  <div class="line">
                    Наименование: <%= productions[j].number+". "+productions[j].name  %>
                  </div>
                 <% break; }  %>
               <% } %>
               <div class="line">
                Ед. продукции:
                <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
               </div>
            <% } %>
          <% } %>
        <% } else { %>
          <% if(!by_service) { %>
            (все услуги)
          <% } else {%>
            <% for(var i in productions) if(productions[i].product_type=='service'){ %>
              <% for(var j in services) { %>
                <% if(services[j]['service_id']==productions[i]['_id']){ %>
                  <div class="line">
                    Наименование: <%= productions[i]['number'] %>. <%= productions[i]['name'] %>
                  </div>
                <% } %>
              <% } %>
            <% } %>
          <% } %>
        <% } %>
        <% if(current_event && current_event.comments && current_event.comments.length) {%>
          <div class="comments-list">
            <span style="font-weight:bold;">Комментарии:</span>
            <% for(var k in current_event.comments){ %>
              <div class="comment span12">
                <span class="date span12"><%= moment(current_event.comments[k].date_change).add(-moment().zone(),'minutes').format('DD.MM.YYYY')+' (<a href="mailto:'+current_event.comments[k].user_email+'">'+current_event.comments[k].user_email+"</a>)" %></span>
                <span class="txt span12"><%= current_event.comments[k].note %></span>
              </div>
            <% } %>
          </div>
        <% } %>
        <% if(App.glHasAccess && current_event && !obj.work_order_id) { %>
          <div class="buttons"><a class="edit-btn">Редактировать</a> <a class="delete-btn">Удалить</a></div>
        <% } %>
  </div>
</script>

<script id="paymentsElemTemplate" type="text/template">
  <div class="pay-elem">
      <span class="payment-type" style="font-weight:bold;"><%=index%>. <%= payment_type.name %></span><br>
      <small><i><%= payment_type.note %></i></small>
      <% var tmpl = _.template($("#paymentsDataTemplate").html()); %>
      <% var full_pays = 0; %>
      <% var has_factpay = false; %>
      <% if(obj.events && obj.events.length>0){
        for(var i in obj.events){
          if(obj.events[i].type=='additional_payment' || obj.events[i].type=='fact_payment'){
            obj.current_event = obj.events[i];
            full_pays+=parseInt(obj.events[i].size);
            has_factpay = true; %>
            <%= tmpl(obj) %>
      <% } } } if (!has_factpay){
          obj.current_event = null; %>
          <%= tmpl(obj) %>
      <% } %>
      <% if(obj.is_canceled) {%>
        <div class="line"><span class="red">Платеж отменен:</span> <span class="grey"><%= obj.cancelation_comment %></span></div>
      <%} else { %>
        <% if(full_pays<obj.size && !obj.work_order_id) { %>
           <div class="row" style = "width:100%;">
            <div class="span12 text-right" style = "float:right">
              <a href="javascript:;" class="add-new-payment btn btn-warning"><span>+</span> <%= has_factpay?"Доплата":"Добавить платеж" %></a>
            </div>
          </div>
        <% } %>
      <% } %>
  </div>
</script>

<script type="text/template" id="paymentsEditForm">
  <div class="span12 payments-edit-form">
    <div class="line-header">
        <span class = "lbl_header" style="font-size: 22px; "><%= obj._id?"Новый платеж":"Редактировать платеж" %></span>
    </div>
    <div class="row" style="margin-top:20px;">
      <div class="form-inline">
        <label>Дата получения платежа:&nbsp;</label><input type="text" class="payment-date" value="<%= obj.date_start?moment(obj.date_start).format('DD.MM.YYYY'):'' %>" />
      </div>
    </div>
    <div class="row">
      <div class="form-inline">
        <label>Размер платежа (руб.):&nbsp;</label><input type="text" class="payment-size" value="<%= obj.size?Routine.priceToStr( obj.size, '0,00', ' ' ):'' %>" />
      </div>
    </div>
    <div class="row">
      <div>
        <label>Комментарии:</label>
        <textarea style="width:940px;" class="payment-comment"></textarea>
      </div>
    </div>
    <div class="row">
      <div class="span12 text-right">
        <a href="javascript:;" class="btn btn-success save-payment">Сохранить</a>
        <a href="javascript:;" class="btn close-payment">Закрыть</a>
      </div>
    </div>
  </div>
</script>
