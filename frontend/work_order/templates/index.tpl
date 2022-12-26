%def scripts():
  <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen, print">
  <!---->
  <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
  <script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.dataTables-1.10.0.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/select2.js?v={{version}}"></script>
  <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/work_order/styles/work_order.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/frontend/work_order/styles/settings_form.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/frontend/work_order/styles/pause_form.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="frontend/work_order/scripts/app.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/models.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/collections.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/router.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/transfer_date_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/search_form_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/data_list_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/add_work_order_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/close_work_orders_dlg_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/settings_form_view.js?v={{version}}"></script>
  <script src="frontend/work_order/scripts/pause_form_view.js?v={{version}}"></script>
  <!--MAIN SCRIPT-->
  <script>
  App.glHasAccess = has_access('workorderdate','o');
  $(function(){
    bootbox.setDefaults({locale: "ru"});
    App.initialize({{! planshiftreason_system_objects }}, {{! works }}, {{! all_workers }});
    window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
  });
  </script>
%end

%rebase master_page/base page_title='Наряды.', current_user=current_user, version=version, scripts=scripts,menu=menu, sector_types=sector_types, sectors=sectors

<!--INCLUDE TEMPLATES-->
%include frontend/work_order/templates/transfer_date plans=plans
%include frontend/work_order/templates/add_work_order sectors=sectors
%include frontend/work_order/templates/settings_form
%include frontend/work_order/templates/pause_form plans=plans


<!-- Шаблон отображения - footer -->
<script id="FooterTemplate" type="text/template">
  <div class="table-footer span12" style = "width:100%;">
  <div class="row blanks-list-body">
    <fieldset class="blanks">
    <legend>Бланки нарядов</legend>
    <div class="blanks-list">
      <% var tmp_nums = [];
        for(var i in items)
        {
        if(items[i].get('blanks') && items[i].get('blanks').length>0)
          tmp_nums.push(items[i].get('number'));
        }%>
      <%if (tmp_nums.length<1){%>
      На выбранные наряды, бланки еще не создавались.
      <%} else {%>
      Выданы на наряды №: <%= tmp_nums.join(', ')%>
      <%}%>
    </div>
    </fieldset>
  </div>
  <div class="row">
    <!--<div class="span6">
    <label style = "display:none"><input id="data-is-right" type="checkbox" checked>&nbsp;Введенные данные проверены и верны.</label>
    </div>-->
    <div class="span12 text-right" style = "width:98%;">
    <button id="cancel-edit" class="btn">Отмена</button>
    <button  id="save-data" class="btn">Сохранить</button>
    <button  id="replace-data" class="btn">Корректировка</button>
    <button  id="show-settings-form" class="btn">Настройки</button>
    <button  id="show-pause-form" class="btn">Приостановка планов</button>
    <button  id="add-blanks" class="btn">Создать бланки</button>
    <button  id="close-data" class="btn" style = "<%=glCurUser.admin=='admin'?'':'display:none'%>">Закрыть выбранные наряды</button>
    </div>
  </div>
  </div>
</script>

<!-- Шаблон оповещения о необходимости заполнения кртериев поиска данных -->
<script id="SetSearchQueryTemplate" type="text/template">
  <div class="span12"><span>Задайте критерии поиска.</span></div>
</script>

<!-- Шаблон оповещения о том, что ничего не найдено -->
<script id="DataNotFoundTemplate" type="text/template">
  <div class="span12"><span>По вашему запросу ничего не найдено.</span></div>
</script>

<!-- Шаблон контейнер для списка занных -->
<script id="DataListTemplate" type="text/template">
  <!--Блок для основных данных-->
  <div class="css-treeview">
    <ul class="data-list"> </ul>
  </div>
  <!--Блок панели управления-->
  <div class="row row-footer"></div>
</script>

<!-- Шаблон элемента договора -->
<script id="ContractItemTemplate" type="text/template">
  <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
  <input type="checkbox" id="item-<%=index%>" class = "cb-item">
  <label class="item-contract underline-ccc lbl-item h1" for="1item-<%=index%>">
   Договор № <%=number%>
   <div class = "control-item-box <%= obj.edit_conditional_date?'extend_width':'' %>">
    <div class = "item">&nbsp;</div>
    <div class = "item"><% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item contract-lock-item"><i class="fa <%= obj.locked && obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
    <!--Use weekends-->
    <div class = "item" style = "display: none">
      <a class="hol-item contract-hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends && obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
      </a>
    </div>
    <!--Settings-->
    <div class = "item">
      <a class="settings-item contract-settings-item" title="Настройка ресурсов">
        <i style = "color:#999"  class="fa fa-users <%= obj.settings?'active':'' %>"></i>
      </a>
    </div>
    <!--Pause-->
    <div class = "item">
      <a class="pause-item contract-pause-item" title="Приостановка планов">
        <i style = "color:#999"  class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
      </a>
    </div>
    <!---->
    <div class = "item">
    <a class="notify-item contract-notify-item" title="Напоминание о наступлении планов" data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
      <i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification && obj.contract_plan_need_notification?'need_notification':'' %>"></i>
    </a>
    </div>
    <div class = "item <%= obj.edit_conditional_date?'fixed_width':'' %>">
    <div class = "linked-date-edit-container contract-linked-date-edit-container"></div>
    <a class="conditional-item contract-conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
      <i style = "color:#999" class="fa fa-link <%= obj.use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i>
    </a>
    </div>
    <div class = "item">
    <a class="contract-plan-item contract-contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed'))?'disabled':'' %>">
      <i style = "color:#999"  class="fa fa-calendar-plus-o <%= obj.use_contract_plan?'use_contract_plan':'' %>"></i>
    </a>
    </div>
    <div class = "item"><input title = "Выделить всё" class="cb-item-check contract-plan-check" type="checkbox" <%=('checked' in obj && checked)?'checked':''%> <%=((status && status=='completed') || obj.locked  )?'disabled':'' %>  ></div>
   </div>
  </label>
  <!--Блок Списка  заказов-->
  <ul class = "data-orders"></ul>
</script>

<!-- Шаблон элемента заказа -->
<script id="OrderItemTemplate" type="text/template">
    <label class="lbl-plus" for="item-<%=parent_index%>-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=parent_index%>-<%=index%>" class = "cb-item">
    <label class="underline-ccc item-order lbl-item h2" for="1item-<%=parent_index%>-<%=index%>">
    Заказ № <%=contract_number%>.<%=production_number%>.<%=production_unit_number%> [<%=production_name%>]
    <div class = "control-item-box <%= obj.edit_conditional_date?'extend_width':'' %>">
      <div class = "item">
      <a class="add-item order-add-item" title="Добавить наряд"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "<%=((status && status=='completed')  )?'color:#999':'color:#000' %> " class="fa fa-plus"></i>
      </a>
      </div>
      <div class = "item"><% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item order-lock-item"><i class="fa <%= obj.locked && obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
      <!--Use weekends-->
      <div class = "item" style = "display: none">
        <a class="hol-item order-hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
          <i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends && obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
        </a>
      </div>
      <!--Settings-->
      <div class = "item">
        <a class="settings-item order-settings-item" title="Настройка ресурсов">
          <i style = "color:#999"  class="fa fa-users <%= obj.settings?'active':'' %>"></i>
        </a>
      </div>
      <!--Pause-->
      <div class = "item">
        <a class="pause-item order-pause-item" title="Приостановка планов">
          <i style = "color:#999"  class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
        </a>
      </div>
      <!---->
      <div class = "item">
      <a class="notify-item order-notify-item" title="Напоминание о наступлении планов" data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification && obj.contract_plan_need_notification?'need_notification':'' %>"></i>
      </a>
      </div>
      <div class = "item <%= edit_conditional_date?'fixed_width':'' %>">
      <div class = "linked-date-edit-container order-linked-date-edit-container"></div>
      <a class="conditional-item order-conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "color:#999" class="fa fa-link <%= obj.use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i>
      </a>
      </div>
      <div class = "item">
      <a class="contract-plan-item order-contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed'))?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-calendar-plus-o <%= obj.use_contract_plan?'use_contract_plan':'' %>"></i>
      </a>
      </div>
      <div class = "item"><input title = "Выделить всё" class="cb-item-check order-plan-check" type="checkbox" <%=('checked' in obj && checked)?'checked':''%> <%=((status && status=='completed') || obj.locked  )?'disabled':'' %>  ></div>
     </div>
    </label>
    <!--Блок Списка  участков-->
    <ul class = "data-sector-types"></ul>
</script>

<!-- Шаблон элемента направления работ (типа участка) -->
<script id="SectorTypeItemTemplate" type="text/template">
    <label class="lbl-plus" for="item-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>" class = "cb-item">
    <label class="underline-ccc item-sector-type lbl-item h3" for="1item-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>"><%=sector_type%>
    <div class = "control-item-box <%= obj.edit_conditional_date?'extend_width':'' %>">
      <div class = "item">
      <a class="add-item sector-type-add-item" title="Добавить наряд"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "<%=((status && status=='completed')  )?'color:#999':'color:#000' %>" class="fa fa-plus"></i>
      </a>
      </div>
      <div class = "item"><% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item sector-type-lock-item"><i class="fa <%= obj.locked && obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
      <!--Use weekends-->
      <div class = "item" style = "display: none">
        <a class="hol-item sector-type-hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
          <i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends && obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
        </a>
      </div>
      <!--Settings-->
      <div class = "item">
        <a class="settings-item sector-type-settings-item" title="Настройка ресурсов">
          <i style = "color:#999"  class="fa fa-users <%= obj.settings?'active':'' %>"></i>
        </a>
      </div>
      <!--Pause-->
      <div class = "item">
        <a class="pause-item sector-type-pause-item" title="Приостановка планов">
          <i style = "color:#999"  class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
        </a>
      </div>
      <!---->
      <div class = "item">
      <a class="notify-item sector-type-notify-item" title="Напоминание о наступлении планов" data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification && obj.contract_plan_need_notification?'need_notification':'' %>"></i>
      </a>
      </div>
      <div class = "item <%= obj.edit_conditional_date?'fixed_width':'' %>">
      <div class = "linked-date-edit-container sector-type-linked-date-edit-container"></div>
      <a class="conditional-item sector-type-conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "color:#999" class="fa fa-link <%= obj.use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i>
      </a>
      </div>
      <div class = "item">
      <a class="contract-plan-item sector-type-contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed'))?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-calendar-plus-o <%= obj.use_contract_plan?'use_contract_plan':'' %>"></i>
      </a>
      </div>
      <div class = "item"><input title = "Выделить всё" class="cb-item-check sector-type-plan-check" type="checkbox" <%=('checked' in obj && checked)?'checked':''%> <%=((status && status=='completed') || obj.locked )?'disabled':'' %>  ></div>
     </div>
    </label>
    <!--Блок Списка  участков-->
    <ul class = "data-sectors"></ul>
</script>

<!-- Шаблон элемента участка -->
<script id="SectorItemTemplate" type="text/template">
    <label class="lbl-plus" for="item-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>" class = "cb-item">
    <label class="underline-ccc item-sector lbl-item h3" for="1item-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>">[<%=sector_code%>] <%=sector_name%>
    <div class = "control-item-box  <%= obj.edit_conditional_date?'extend_width':'' %>">
      <div class = "item">
      <a class="add-item sector-add-item" title="Добавить наряд"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "<%=((status && status=='completed')  || obj.is_auto  )?'color:#999':'color:#000' %> " class="fa fa-plus"></i>
      </a>
      </div>
      <div class = "item"><% if(has_access('workorderdate','o')){ %>
      <a title="Запрет корректировок планов." class="lock-item sector-lock-item"><i class="fa <%= obj.locked && obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %>
      </div>
      <!--Use weekends-->
      <div class = "item" style = "display: none">
        <a class="hol-item sector-hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
          <i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends && obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
        </a>
      </div>
      <!--Settings-->
      <div class = "item">
        <a class="settings-item sector-settings-item" title="Настройка ресурсов">
          <i style = "color:#999"  class="fa fa-users <%= obj.settings?'active':'' %>"></i>
        </a>
      </div>
      <!--Pause-->
      <div class = "item">
        <a class="pause-item sector-pause-item" title="Приостановка планов">
          <i style = "color:#999"  class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
        </a>
      </div>
      <!---->
      <div class = "item"><a class="notify-item sector-notify-item" title="Напоминание о наступлении планов" data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>"><i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification && obj.contract_plan_need_notification?'need_notification':'' %>"></i></a></div>
      <div class = "item <%= obj.edit_conditional_date?'fixed_width':'' %>" >
      <div class = "linked-date-edit-container sector-linked-date-edit-container"></div>
      <a class="conditional-item sector-conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
          <i style = "color:#999" class="fa fa-link <%= obj.use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i>
      </a>
      </div>
      <div class = "item">
      <a class="contract-plan-item sector-contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed'))?'disabled':'' %>">
        <i style = "color:#999"  class="fa fa-calendar-plus-o <%= obj.use_contract_plan?'use_contract_plan':'' %>"></i>
      </a>
      </div>
      <div class = "item"><input title = "Выделить всё" class="cb-item-check sector-plan-check" type="checkbox" <%=('checked' in obj && checked)?'checked':''%> <%=((status && status=='completed') || obj.locked )?'disabled':'' %>  ></div>
     </div>
    </label>
    <!--Блок Списка  нарядов-->
    <ul class = "data-workorders"></ul>
</script>

<!-- Шаблон элемента наряда -->
<script id="WorkOrderItemTemplate" type="text/template">
    <label class="lbl-plus" for="item-<%=parent_parent_parent_parent_index%>-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=parent_parent_parent_parent_index%>-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>" class = "cb-item">
    <label class="lbl-item h4 item-workorder" for="1item-<%=parent_parent_parent_parent_index%>-<%=parent_parent_parent_index%>-<%=parent_parent_index%>-<%=parent_index%>-<%=index%>">
    <span class = "lbl"><%=number%></span>
    <% if ('history' in obj && history.length>0 ){ %>
      <span class = "lbl font12"><b>Открыт:</b> <%=moment.utc(history[0]['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%>; <%=window.MANAGERS[history[0]['user']]%>.</span>
    <%}%>
    <% if ('status' in obj && status=='completed' && completed_by ){ %>
      <span class = "lbl font12"><b>Закрыт:</b> <%=moment.utc(completed_by['date_change'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%>; <%=window.MANAGERS[completed_by['user_email']]%></span>
    <%}%>

    <!-- not active-->
    <div style = "display: none">
      <i class="fa fa-users" style = "margin-left:20px;" title = "Рабочих на наряде"></i>
      <a title="Человек на наряде." class="lnk lnk-people" style = "margin-left:3px; display:<%=edit_people?'none':''%>">[<%=people%>]</a>
      <input type="text" value = "<%=people%>" class = "tb tb-people" style = "display:<%=edit_people?'':'none'%>" />
    </div>

    <div class = "control-item-box">
      <div class = "item" style = "width:230px;">
      <a class="add-item workorder-edit-item" style = "white-space: nowrap; <%=((status && status=='completed')  )?'color:#999!important':'color:#000' %>" title="Добавить работы в наряд"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
        <i style = "<%=((status && status=='completed')  )?'color:#999':'color:#000' %> " class="fa fa-plus-circle"></i>&nbsp; Добавить работы в наряд
      </a>
      </div>
    </div>
    </label>

    <!--Блок Списка  работ-->
    <ul class = "data-works">
    <li>
      <!--блок вывода устранения замечаний-->
      <div class="row1" style="margin-bottom:10px;">
      <label class="checkbox"><input type="checkbox" class="remark-chk" data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" <%= (obj.remarks && obj.remarks.contains_remark)?"checked":""  %> />Устранение замечаний</label>
      </div>
      <div class="remark-frm" <%= (obj.remarks && obj.remarks.contains_remark)?"":'style="display:none;"'  %>>
      <div class="row1"><label class="control-label" style="padding-top:3px;">№ претензии:&nbsp;</label><input type="text" style="width:600px" class="remark-numbers" /></div>
      <div class="row1"><label class="control-label">Примечание:</label><textarea style="width:90%;" class="remark-comments" /></div>
      </div>
      <!--блок вывода списка работ-->
      <table class="in-info">
      <thead>
        <tr>
        <td class = "linked-date-edit-container workorder-linked-date-edit-container"></td>
        <td style="width:50px;">Ч-ч</td>
        <td style="width:50px;">Объем</td>
        <td style="width:50px; text-align:center">Ед.</td>
        <td style="width:30px;"  class = "font16">
           <a class="contract-plan-item workorder-contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed'))?'disabled':'' %>" >
          <i style = "color:#999" class="fa fa-calendar-plus-o <%= use_contract_plan?'use_contract_plan':'' %>"></i>
          </a>
        </td>
        <td style="width:90px;"></td>
        <td style="width:50px;">Длит-ть, дн.</td>
        <td style="width:30px;"  class = "font16">
          <a class="conditional-item workorder-conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" >
          <i style = "color:#999" class="fa fa-link <%= use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i>
          </a>
        </td>
        <td style="width:120px;">Дата начала работ</td>
        <td style="width:120px;">Дата окончания</td>
        <td style="width:32px; text-align: center;" class = "font16">
          <input class="cb-item-check workorder-plan-check" type="checkbox" <%=('checked' in obj && checked)?'checked':''%> <%=((status && status=='completed') || obj.locked )?'disabled':'' %>  >
        </td>
        <td style="width:32px;" class = "font16">
          <a class="notify-item workorder-notify-item" title="Напоминание о наступлении планов"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
          <i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification&&obj.contract_plan_need_notification?'need_notification':'' %>"></i>
          </a>
        </td>

        <!--USE weekends-->
        <td style="width:32px; display: none" class = "font16">
          <a class="hol-item workorder-hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>">
          <i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends&&obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
          </a>
        </td>
        <!--Настройки глобальной приостановки-->
        <td style="width:32px;" class = "font16">
          <a class="pause-item workorder-pause-item" title="Приостановка планов">
          <i style = "color:#999"  class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
          </a>
        </td>
        <!--Настройки ресурсов-->
        <td style="width:32px;" class = "font16">
          <a class="settings-item workorder-settings-item" title="Настройка ресурсов">
          <i style = "color:#999"  class="fa fa-users <%= obj.settings?'active':'' %>"></i>
          </a>
        </td>

        <!---->

        <td style="width:32px;" class = "font16">
          <% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item workorder-lock-item"><i class="fa <%= obj.locked && obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %>
        </td>
        <td style="width:32px;" class = "font16">
          <a class="remove-item workorder-remove-item" title="Удалить наряд"  data-disabled = "<%=((status && status=='completed') || obj.locked )?'disabled':'' %>">
          <i style = "" class="fa fa-minus-circle"></i>
          </a>
        </td>
        </tr>
      </thead>
      <tbody class = "data-works-body"></tbody>
      </table>
    </li>
    </ul>
</script>

<!-- Шаблон элемента работы -->
<script id="WorkItemTemplate" type="text/template">
  <!--флаг указывающие на наличие переноса сроков-->
  <td class="<%=(status==='completed')? 'line-through':''%>">
    [<%= code %>]<%= name %><%=('plan_shifts' in obj && plan_shifts)?'*':''%>
  </td>
  <!--Человекачасы-->
  <td class="timing">
    <input
      type="text"
      title = "Человеко-часы"
      class = "tb span1 timing"
      value="<%= timing.toFixed() %>"
      style = "width:30px;"
      <%=date_start_with_shift?'readonly':'' %>
    />
  </td>
  <!--объем-->
  <td class="volume">
    <%if(payment_id){%>
      <!--Платеж-->
      <input
        type="text"
        title = "Введи символ %, если физический объем не важен или неизвестен. Удалите % чтобы использовать физ. объём"
        class = "tb span1 volume"
        value="<%= is_unit_percent?Routine.floatToStr(scope.toFixed())+'%': date_start_with_shift?Routine.priceToStr(scope, '0,00', ' '):Routine.floatToStr(scope.toFixed(2))%>"
        style = "<%=!App.hasUserAccessToContracts|| !App.checkUserAccessToSector(sector_code)?'display:none':'' %>; width:100px;"  <%=date_start_with_shift?'readonly':'' %>
      />
    <%} else {%>
      <!--Работа-->
      <input
        type="text"
        title = "Введи символ %, если физический объем не важен или неизвестен. Удалите % чтобы использовать физ. объём"
        class = "tb span1 volume"
        value="<%= is_unit_percent?Routine.floatToStr(scope.toFixed())+'%': Routine.floatToStr(scope.toFixed(3)) %>"
        style = "width:100px; <%=!App.checkUserAccessToSector(sector_code)?'display:none':''%>"
        <%=date_start_with_shift?'readonly':'' %>
      />
    <%}%>
    <!--if volume is hidden-->
    <input
      type="text"
      disabled
      value="(скрыто)"
      style = "<%=(payment_id && !App.hasUserAccessToContracts)||!App.checkUserAccessToSector(sector_code)?'':'display:none' %>; width:100px;"
    />
  </td>

  <!--ед. изм-->
  <td class="unit" style = "text-align:center"><%= is_unit_percent?'':unit %></td>
  <!--планы по договору-->
  <td style = "width:34px;">
    <a class = "contract-plan-item" title="Планы по договору"  data-disabled = "<%=((status && status=='completed') || contract_plan_date_start_with_shift)?'disabled':'' %>"><i style = "color:#999"  class="fa fa-calendar-plus-o <%= obj.use_contract_plan?'use_contract_plan':'' %>"></i></a>
  </td>
  <!--пометка к дням-->
  <td>
    <!-- Планы по договору-->
    <div class = "inner-line contract-plan" style = "line-height: 10px;<%=use_contract_plan?'display:block':'display:none'%>">
      <span>Планы<br/>по договору</span>
    </div>
    <!-- Собственные планы-->
    <div class = "inner-line" style = "line-height: 10px;">
      <span>Наши<br/>планы</span>
    </div>
  </td>

  <!--дни-->
  <td class="days">
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <input title = "по договору" type="text" class = "tb span1 contract_plan_days"  value="<%= contract_plan_date_start_with_shift?(moment(contract_plan_date_finish_with_shift,'DD.MM.YYYY').diff(moment(contract_plan_date_start_with_shift,'DD.MM.YYYY'), 'days'))+1:contract_plan_days_count %>" style = "<%=payment_id && !App.hasUserAccessToContracts?'display:none':'' %>" <%=contract_plan_date_start_with_shift ?'readonly':'' %> />
    <input title = "по договору" class = "span1" type="text" disabled value="" style = "<%=payment_id && !App.hasUserAccessToContracts?'':'display:none' %>" />
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <input  title = "наши" type="text" class = "tb span1 days"  value="<%= date_start_with_shift?(moment(date_finish_with_shift,'DD.MM.YYYY').diff(moment(date_start_with_shift,'DD.MM.YYYY'), 'days'))+1:days_count %>" style = "<%=payment_id && !App.hasUserAccessToContracts?'display:none':'' %>" <%=date_start_with_shift ?'readonly':'' %> />
    <input title = "наши" class = "span1" type="text" disabled value="" style = "<%=payment_id && !App.hasUserAccessToContracts?'':'display:none' %>" />
  </div>
  </td>
  <!--условная дата-->
  <td >
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <a class="conditional-item" title="Зависимые планы по договору" data-contract-plan="true"  data-disabled = "<%=((status && status=='completed') || (obj.contract_plan_locked) )?'disabled':'' %>" >
    <i style = "color:#999" class="fa fa-link <%= contract_plan_use_conditional_date || contract_plan_edit_conditional_date?'use_conditional_date':'' %> "></i>
    </a>
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <a class="conditional-item" title="Зависимые планы"  data-disabled = "<%=((status && status=='completed') || (obj.locked) )?'disabled':'' %>" ><i style = "color:#999" class="fa fa-link <%= use_conditional_date || edit_conditional_date?'use_conditional_date':'' %> "></i></a>
  </div>
  </td>
  <!-- Дата начала-->
  <td style = "width:128px">
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <!--Блок редактирования условной даты-->
    <ul class="linked-date-edit-box" style = "display:<%=(contract_plan_edit_conditional_date)?'':'none'%>;" data-contract-plan="true" >
    <li>
      <span class="lbl">Главная задача</span>
      <input class="tb tb-condition-work" value="<%=('contract_plan_depends_on' in obj && contract_plan_depends_on)?contract_plan_depends_on['workorder_number'].toString()+'/'+ contract_plan_depends_on['work_code'].toString():''%>" type="text" placeholder="наряд/код работы" />
    </li>
    <li>
      <span class="lbl display-block">дней до начала</span>
      <input class="tb span1 tb-condition-start-days" value="<%=('contract_plan_depends_on' in obj && contract_plan_depends_on)?contract_plan_depends_on['days_before_start'].toString():'0'%>" type="text" />
    </li>
    <li class = "control-box">
      <span class="lnk lnk-ok" >Соханить</span>
      <span class="lnk lnk-cancel">Отмена</span>
    </li>
    </ul>
    <!--оторажение условной даты-->
    <% var tmp_link_info = 'нет данных';
    if('contract_plan_depends_on' in obj && contract_plan_depends_on){
      tmp_link_info = ((contract_plan_depends_on['date'])?moment.utc(contract_plan_depends_on['date']).add(contract_plan_depends_on['days_before_start'], 'days').format('DD.MM.YYYY')+' ' :'') + '['+contract_plan_depends_on['workorder_number'].toString()+'/'+ contract_plan_depends_on['work_code'].toString() + ']';
    }%>
    <span class = "lnk lnk-conditional-date" title = "редактировать" style = "display:<%=(contract_plan_use_conditional_date && !contract_plan_edit_conditional_date)?'':'none'%>;" data-contract-plan="true"><%=('contract_plan_depends_on' in obj && contract_plan_depends_on)?tmp_link_info:'нет данных' %></span>
    <!-- оторажение нормальноый даты-->
    <input readonly placeholder="по договору" class="tb contract_plan_datepicker1 contract_plan_datestart" value="<%= (contract_plan_date_start_with_shift)?contract_plan_date_start_with_shift:contract_plan_date_start %>" type="text" style = "display:<%=(contract_plan_edit_conditional_date || contract_plan_use_conditional_date)?'none':''%>; width:100px;" <%=((status && status=='completed') || (obj.contract_plan_locked) )?'disabled':'' %> />
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <!--Блок редактирования условной даты-->
    <ul class="linked-date-edit-box" style = "display:<%=(edit_conditional_date)?'':'none'%>;">
    <li>
      <span class="lbl">Главная задача</span>
      <input class="tb tb-condition-work" value="<%=('depends_on' in obj && depends_on)?depends_on['workorder_number'].toString()+'/'+ depends_on['work_code'].toString():''%>" type="text" placeholder="наряд/код работы" />
    </li>
    <li>
      <span class="lbl display-block">дней до начала</span>
      <input class="tb span1 tb-condition-start-days" value="<%=('depends_on' in obj && depends_on)?depends_on['days_before_start'].toString():'0'%>" type="text" />
    </li>
    <li class = "control-box">
      <span class="lnk lnk-ok" >Соханить</span>
      <span class="lnk lnk-cancel">Отмена</span>
    </li>
    </ul>
    <!--оторажение условной даты-->
    <% var tmp_link_info = 'нет данных';
    if('depends_on' in obj && depends_on){
      tmp_link_info = ((depends_on['date'])?moment.utc(depends_on['date']).add(depends_on['days_before_start'], 'days').format('DD.MM.YYYY')+' ' :'') + '['+depends_on['workorder_number'].toString()+'/'+ depends_on['work_code'].toString() + ']';
    }%>
    <span class = "lnk lnk-conditional-date" title = "редактировать" style = "display:<%=(use_conditional_date && !edit_conditional_date)?'':'none'%>;"  data-disabled = "<%=((status && status=='completed') || (obj.locked) )?'disabled':'' %>" >
    <%=('depends_on' in obj && depends_on)?tmp_link_info:'нет данных' %>
    </span>
    <!-- оторажение нормальноый даты-->
    <input readonly placeholder="наши" class="tb datepicker1 datestart" value="<%= (date_start_with_shift)?date_start_with_shift:date_start %>" type="text" style = "display:<%=(edit_conditional_date || use_conditional_date)?'none':''%>; width:100px;"  <%=((status && status=='completed') || (obj.locked) )?'disabled':'' %> />
  </div>
  </td>
  <!-- Дата окончания-->
  <td style = "width:129px">
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <input readonly placeholder="по договору" class="tb contract_plan_datepicker2 contract_plan_datefinish" value="<%= (contract_plan_date_finish_with_shift)?contract_plan_date_finish_with_shift:contract_plan_date_finish %>" type="text" style = "width:100px;" <%=((status && status=='completed') || (obj.contract_plan_locked) )?'disabled':'' %>>
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <input readonly placeholder="наши" class="tb datepicker2 datefinish" value="<%= (date_finish_with_shift)?date_finish_with_shift:date_finish %>" type="text" style = "width:100px;" <%=((status && status=='completed') || (obj.locked) )?'disabled':'' %>>
  </div>
  </td>
  <!-- Чекбокс-->
  <td style = "width:34px; text-align: center; vertical-align: middle;" >
  <input class="work-plan-check cb-item-check" <%=('checked' in obj && checked)?'checked':''%> type="checkbox" <%=((status && status=='completed') || obj.locked  )?'disabled':'' %>>
  </td>
  <!-- Напоминание о наступлении планов-->
  <td style = "width:34px;">
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <a class="notify-item" title="Напоминание о наступлении планов"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" data-contract-plan="true">
    <i style = "color:#999"  class="fa fa-clock-o <%= obj.contract_plan_need_notification?'need_notification':'' %>" data-contract-plan="true"></i>
    </a>
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <a class="notify-item" title="Напоминание о наступлении планов"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>"><i style = "color:#999"  class="fa fa-clock-o <%= obj.need_notification?'need_notification':'' %>"></i></a>
  </div>
  </td>

  <!-- Учет выходных-->
  <td style = "width:34px; display: none">
    <!-- Планы по договору-->
    <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
      <a class="hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>" data-contract-plan="true">
      <i style = "color:#999"  class="fa fa-calendar <%= obj.contract_plan_use_weekends?'use_weekends':'' %>"></i>
      </a>
    </div>
    <!-- Собственные планы-->
    <div class = "inner-line">
      <a class="hol-item" title="Учёт выходных"  data-disabled = "<%=((status && status=='completed')  )?'disabled':'' %>"><i style = "color:#999"  class="fa fa-calendar <%= obj.use_weekends?'use_weekends':'' %>"></i></a>
    </div>
  </td>

  <!-- Приостановка планов -->
  <td style = "width:34px; text-align: center; vertical-align: middle;" >
    <a class="pause-item" title="Приостановка планов">
      <i style = "color:#999" class="fa fa-pause-circle-o <%= obj.pause?'active':'' %>"></i>
    </a>
  </td>

  <!-- Настройки ресурсов -->
  <td style = "width:34px; text-align: center; vertical-align: middle;" >
    <a class="settings-item" title="Настройка ресурсов">
      <i style = "color:#999" class="fa fa-users <%= obj.settings?'active':'' %>"></i>
    </a>
  </td>

  <!-- Запрет корректировки планов-->
  <td style = "width:34px;">
  <!-- Планы по договору-->
  <div class = "inner-line contract-plan" style = "<%=use_contract_plan?'display:block':'display:none'%>">
    <% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item" data-contract-plan="true"><i class="fa <%= obj.contract_plan_locked?'fa-lock':'fa-unlock' %>"></i></a><% } %>
  </div>
  <!-- Собственные планы-->
  <div class = "inner-line">
    <% if(has_access('workorderdate','o')){ %><a title="Запрет корректировок планов." class="lock-item"><i class="fa <%= obj.locked?'fa-lock':'fa-unlock' %>"></i></a><% } %>
  </div>
  </td>
  <td style="width:30px; vertical-align: middle" class = "font16">
  <a class="remove-item work-remove-item" title="Удалить работу из наряда"  data-disabled = "<%=(obj.locked|| obj.is_auto)?'disabled':'' %>"><i class="fa fa-minus"></i></a>
  </td>
</script>

<!--Шаблон группового блока редактирования условной даты-->
<script id="LinkedDateEditBoxTemplate" type="text/template">
  <div class="linked-date-edit-box" style = "display:<%=(edit_conditional_date)?'':'none'%>;">
    <span class="lbl">Задача</span>
    <input class="tb tb-condition-work" value="<%=('depends_on' in obj && depends_on)?depends_on['workorder_number'].toString()+'/'+ depends_on['work_code'].toString():''%>" type="text" placeholder="наряд/работа" />
    <span class="lbl">дней до начала</span>
    <input class="tb tb-condition-start-days" value="<%=('depends_on' in obj && depends_on)?depends_on['days_before_start'].toString():'0'%>" type="text" />
    <span class="lnk lnk-ok" >Соханить</span>
    <span class="lnk lnk-cancel">Отмена</span>
  </div>
</script>

<!--ШАБЛОН ФОРМЫ ЗАКРЫТИЯ НАРЯДОВ-->
<script id="closeWorkordersTemplate" type="text/template">
  <div class="modal close-workorders-dlg">
  <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
    <h5>Закрыть выбранные наряды</h5>
  </div>
  <div class="modal-body form-horizontal">
    <div class="line" style = "border-bottom:dashed 1px #ccc">
    <% var numbers = [];
    for(var i in items){
      numbers.push(items[i]['number']);
    }%>
    <%=numbers.join(', ')%>
    </div>
    <div class="line">
    <textarea  type="text" rows="3" placeholder="Введите примечание" class="note" ></textarea>
    </div>
  </div>
  <div class="modal-footer">
    <div class="control-group">
    <div class="controls">
      <a href="javascript:;" class="btn btn-primary btn-save">Ok</a>
      <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
    </div>
    </div>
  </div>
  </div>
</script>

<!--Модальная форма переноса сроков-->
<div id="transfer-modal" class="modal hide" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static" ></div>

<!-- Шаблон элемента фильтра по участкам -->
<script id="filterItemTemplateSector" type="text/template">
  <option value = "<%=code%>" <%=(enabled)?"":"disabled"%>  <%=(checked)?"selected":""%>  ><%="[" + code + "] " + name%></option>
</script>

<!-- Шаблон элемента фильтра по видам участков -->
<script id="filterItemTemplateSectorType" type="text/template">
  <option value = "<%=name%>" <%=(enabled)?"":"disabled"%>  <%=(checked)?"selected":""%>  ><%=name%></option>
</script>

<!--Панель поиска и фильтрации данных-->
<div class = "row hidden-print filter-panel"  id="find-order-form" style = "margin-left:0px;">
  <div  class="span12" style = "width:100%;">
    <div class="navbar">
      <div  id = "pnlJobLogFilter" class="navbar-inner" style=  "padding-top:10px" >
      <div>
        <div class="input-prepend input-append">
        <span class="add-on"><b class="icon-list-alt"></b></span>
        <select  id="filter-type" style = "width:150px;">
          <option value="contract" >Номер договора</option>
          <option value="order" selected>Номер заказа</option>
          <option value="workorder">Номер наряда</option>
        </select>
        <input type="text" class="filter-number"  id="order-number"  placeholder="введите номер" style = "width:100px;" />
        </div>
        <!-- Open groups -->
        <button value = "collapsed"  class="btn btn-collapse" style = "margin:0px 0px 3px 0px; float:right; display:none">
          <i class="fa fa-folder"></i>&nbsp;&nbsp;Раскрыть группы
        </button>
        <button type="submit" class="btn btn-print"  style = "display:none"><i class="icon-print"></i></button>
      </div>
      <!--FILTERS-->
      <div style = "margin-bottom:10px;">
        <!--sectior type filter-->
        <div class='pnl-ddl input-append pnl-ddl-sector-types' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-sector-types" multiple="multiple"  style = "display:none"></select>
        </div>
        <!--Sectors filter-->
        <div class='pnl-ddl input-append pnl-ddl-sectors' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-sectors" multiple="multiple"  style = "display:none">
          %for sector_type in sectors:
          <optgroup label="{{sector_type['info']['name']}}">
            %for sector in sector_type['items']:
            <option value="{{str(sector['code'])}}">[{{sector['code']}}] {{sector['name']}}</option>
            %end
          </optgroup>
          %end
          </select>
        </div>
          <!--Workorders filter-->
        <div class='pnl-ddl input-append pnl-ddl-workorders' style='display:none; margin:3px 0px 3px 0px;' >
          <select class="ddl-workorders"   style = "display:none">
          <option value="all">Все</option>
          <option value="completed">Закрытые</option>
          <option value="opened">Открытые</option>
          </select>
        </div>
        <!--Works filter-->
        <div class='pnl-ddl input-append pnl-ddl-works' style='display:none; margin:3px 0px 3px 0px;'>
          <select class="ddl-works" multiple="multiple"  style = "display:none">
          <option value="no_volumes">Нет объемов</option>
          <option value="no_days">Нет длительности</option>
          <option value="no_dates">Нет планов</option>
          </select>
        </div>
        <button class="btn btn-primary btn-filter"  id="find-by-order-number" style = "margin-top:0px">Открыть</button>
      </div>
      <!--end filter-->
      </div>
    </div>
  </div>
</div>
<!-- Блок данных -->
<div class="row" style = "margin-left:0px;">
  <div class="span12" style = "width:100%;">
    <hr><div id="data-body" class = "data-body"></div><hr>
  </div>
</div>








