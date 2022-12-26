%def scripts():
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/bootstrap-datepicker-1.4.0.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/bootstrap-datepicker.standalone-1.4.0.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">

  <script src="/static/scripts/libs/babel.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>
  <script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/shift_task/styles/shift_task_facts.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/frontend/shift_task/styles/shift_task_facts_print.css?v={{version}}" rel="stylesheet" media="print">

  <script src="/frontend/shift_task/scripts/fact/app.js?v={{version}}3"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_models.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_collections.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_views.js?v={{version}}"></script>
  <script  type="text/babel" src="/frontend/shift_task/scripts/common_controls/templates_calculator.js?v={{version}}1"></script>

  <script>$(function() {
      $.ajaxSetup({timeout:50000});
      bootbox.setDefaults({locale: "ru"});''
      $("#shift_task_facts").show();
      // инициализация управления основной формой
      App.initialize();
      window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
    });
  </script>
%end
%rebase master_page/base_lastic page_title='Отчет производства за смену', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

%include frontend/shift_task/templates/common_controls/cut_templates

<!--УЧАСТОК-->
<script id="sectorItemTemplate" type="text/template">
  <label class = 'lbl-plus' for="own-item-<%=i%>">&nbsp;</label>
  <input type="checkbox" id="own-item-<%=i%>" class = "cb-item" />
  <label class = "lbl-item h1" for="1item-<%=i%>">
    <table class = "data">
      <tbody>
        <tr>
          <td ><%=name%></td>
        </tr>
      </tbody>
    </table>
  </label>
  <ul class = "sector-item-container"></ul>
</script>

<!--ЗАДАНИЕ НА СМЕНУ-->
<script id="shiftTaskItemTemplate" type="text/template">
  <label class = 'lbl-plus' for="own-item-<%=i%>-<%=j%>">&nbsp;</label>
  <input type="checkbox" id="own-item-<%=i%>-<%=j%>" class = "cb-item shift-task-cb-item" />
  <label class = "lbl-item h1" for="1item-<%=i%>-<%=j%>">
    <table class = "data">
      <tbody>
        <tr>
          <td >
            <span>Сменное задание № <%=number%></span><br/>
            <span class = "color-lightgrey">на производство по заказу № <%=order['number']%> от <%=moment.utc(date, 'YYYY-MM-DD').local().format('DD.MM.YYYY')%></span><br/>
            <% if('note' in obj && note ){%>
              <span class = "color-lightgrey">Комментарий: <%=Routine.rNToBr(note)%></span><br/>
            <%}%>
            <span class = "color-lightgrey">-------------</span><br/>
            <span class = "color-lightgrey">Создано <%=moment.utc(date_add, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%>; <%=window.MANAGERS[manager_add] + ' ('+manager_add+')'%> </span><br/>
            <% if(complete){%>
              <span class = "color-lightgrey">Закрыто: <%=moment.utc(complete['date'], 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%>; <%=window.MANAGERS[complete['user']] + ' ('+complete['user']+')'%></span><br/>
            <%}%>
          </td>
        </tr>
      </tbody>
    </table>
  </label>
  <ul  class = "sector-items-box" style = "padding-bottom:30px">
     <!-- Блок примененные шаблоны раскроя -->
    <div class = "pnl-used-templates-body-container" >
      <fieldset class="collapsible collapsed" style = "float:left; width:100%">
        <legend ><b>Примененные шаблоны раскроя</b><br><span class = "legend-m">Список примененных шаблонов раскроя в рамках задания</span></legend>
        <div style = "display: none">
           <div class = 'css-treeview'>
              <table class = 'data' style = "width:100%">
                <thead>
                  <tr>
                    <td style = "width:81%">Шаблон</td>
                    <td style = "width:10%">План</td>
                    <td style = "width:9%">Факт</td>
                  </tr>
                </thead>
              </table>
              <ul class = "templates-list"></ul>
           </div>
        </div>
      </fieldset>
    </div>
    <div class = "pnl-items">
      <table class = 'in-info'>
        <thead>
          <tr style = "background-color: whitesmoke;">
            <td colspan="3" class="black-border"></td>
            <td colspan="4" class="black-border">План</td>
            <td colspan="3" class="black-border">Факт / ранее</td>
            <td colspan="4">Факт / текущий</td>
          </tr>
          <tr>
            <td style="width:3%">№</td>
            <td style="width:10%">Артикул</td>
            <td class="black-border" style="width:29%">Название</td>
            <!-- План-->
            <td style="width:5%">Кол-во, шт</td>
            <td style="width:5%">Вес на ед., кг</td>
            <td style="width:5%">Полн. вес, кг</td>
            <td class="black-border" style = "width:6%">Время, чч:мм</td>
            <!-- Факт ранее-->
            <td style="width:3%">Факт</td>
            <td style="width:5%">Полн. вес, кг</td>
            <td class="black-border" style = "width:4%">Время, чч:мм</td>
            <!-- Факт текущий-->
            <td style="width:8%">Факт<a style = "margin-left: 5px;"class = "icon-link all-use-product-struct"  title = "Учитывать структуру изделия"><i class="fa fa-sitemap"></i></a></td>
            <td style="width:5%">Полн. вес, кг</td>
            <td style = "width:6%">Время, чч:мм</td>
            <td style = "width:4%"></td>
          </tr>
        </thead>
        <tbody class = "spec-data-list"></tbody>
      </table>
    </div>
    <div style="margin:20px 10px 10px 0px; text-align:right">
        <input type="button" class = "btn btn-success pre-save-data" value = "Сохранить"  />
        <input type="button" class = "btn btn-danger save-data" value = "Провести"  />
        <input type="button" class = "btn cancel-data" value = "Отмена"  />
        <input type="button" class = "btn print-data" value = "Распечатать"  />
        <input type="button" class = "btn download-xls-data" value = "Скачать"  />
        <input type="button" class = "btn download-pdf-data" value = "Этикетки"  />
    </div>
  </ul>
</script>

<!--ЗАДАНИЕ НА СМЕНУ ДЛЯ ПЕЧАТИ-->
<script id="shiftTaskItemTemplatePrint" type="text/template">
  <label class = "lbl-item h1" for="1item-<%=i%>-<%=j%>">
    <table class = "data">
      <tbody>
        <tr>
          <td >
            <span><%=(sector)?sector['name']:''%></span><br/><br/>
            <span>Сменное задание № <%=number%></span><br/>
            <span >на производство по заказу № <%=order['number']%> от <%=moment.utc(date, 'YYYY-MM-DD').local().format('DD.MM.YYYY')%></span><br/>
          </td>
        </tr>
      </tbody>
    </table>
  </label>
  <div>
    <table class = 'in-info bordered-black'>
      <thead>
        <tr>
          <td style = "width:5%">№</td>
          <td style = "width:10%">Артикул</td>
          <td style = "width:55%">Название</td>
          <td style = "width:10%">План</td>
          <td style = "width:10%">Факт</td>
        </tr>
      </thead>
      <tbody class = "spec-data-list"></tbody>
    </table>
  </div>

</script>

<!--СПЕЦИФИКАЦИЯ НА ПЕЧАТЬ-->
<script id="specificationItemTemplatePrint" type="text/template">
  <tr>
    <td><%=i%></td>
    <td><%=number%></td>
    <td><%=name%></td>
    <td><%=count['value']%></td>
    <td></td>
  </tr>
</script>

<!--ITOGO ITEM TEMPLATE TO PRINT-->
<script id="specificationItogoTemplatePrint" type="text/template">
  <tr class = "tr-footer">
    <td></td>
    <td></td>
    <td></td>
    <td><%=plan%></td>
    <td></td>
  </tr>
</script>

<!--СПЕЦИФИКАЦИЯ-->
<script id="specificationItemTemplate" type="text/template">
  <td><%=i%></td>
  <td><%=number%></td>
  <td class = "black-border"><%=name%></td>
  <!--План-->
  <td><%=count['value']%></td>
  <td style = "white-space: nowrap;"><%=Routine.addCommas(weight_per_unit.toFixed(3).toString(), " ")%></td>
  <td style = "white-space: nowrap;"><%=Routine.addCommas((weight_per_unit*count['value']).toFixed(3).toString(), " ")%></td>
  <td style = "white-space: nowrap;" class = "black-border"><%=(plan_time)?Routine.hhmmss(plan_time): '-' %></td>
  <!--Факт ранее-->
  <td style = "white-space: nowrap;"><span class="lnk lnk-fact-history"><%=(pre_fact)?pre_fact['value']:''%></span></td>
  <td style = "white-space: nowrap;"><%=(pre_fact_weight)?Routine.addCommas(pre_fact_weight.toFixed(3).toString(), " "): '-' %></td>
  <td style = "white-space: nowrap;" class = "black-border"><%=(pre_fact_time)?Routine.hhmmss(pre_fact_time): '-' %></td>
  <!--Факт текущий-->
  <td>
    <div class = "tb-fact-box">
      <input type="text" class="tb tb-fact"  placeholder="0" value = "<%=(fact)?fact['value']:'' %>"  />
      <a style = "margin-left: 5px;"class = "icon-link use-product-struct <%= obj.use_product_struct?'':'not_active' %>"  title = "Учитывать структуру изделия"><i class="fa fa-sitemap"></i></a>
    </div>
  </td>
  <!-- Вес-->
  <td style = "white-space: nowrap;"><%=(fact_weight)?Routine.addCommas(fact_weight.toFixed(3).toString(), " "): '-' %></td>
  <!-- Время-->
  <td style = "white-space: nowrap;"><%=(fact_time)?Routine.hhmmss(fact_time): '-' %></td>
  <td class = "lbl-balance font16 center">
    <% if(((fact && fact['value'])  || (pre_fact && pre_fact['value']) )&& balance){

      var tmp_fact_value = (fact && fact['value'] && !fact['date'] )?fact['value']: 0;
      var tmp_pre_fact_value = (pre_fact && pre_fact['value'])?pre_fact['value']: 0;

      if(tmp_fact_value+tmp_pre_fact_value> count['value']){%>
        <span class = "color-3" title= "Количество превышает плановый объем."><%=balance%></span>
      <%} else if(tmp_fact_value+tmp_pre_fact_value< count['value']){%>
        <span class = "color-2" title= "Количество меньше планового объема."><%=balance%></span>
      <%} else {%>
        <span class = "color-1" title= "Количество равно плановому объему."><%=balance%></span>
    <%}}%>
  </td>
</script>

<!--ITOGO ITEM TEMPLATE-->
<script id="specificationItogoTemplate" type="text/template">
  <tr class = "tr-footer">
    <td></td>
    <td></td>
    <td class = "black-border"></td>
    <!--План-->
    <td><b><%=Routine.addCommas(plan, " ")%></b></td>
    <td><b><%=Routine.addCommas(weight_per_unit.toFixed(3).toString(), " ")%></b></td>
    <td><b><%=Routine.addCommas(weight_full.toFixed(3).toString(), " ")%></b></td>
    <td class = "black-border"><b><%=(plan_time)?Routine.hhmmss(plan_time): '-' %></b></td>
    <!--Факт ранее-->
    <td><b><%=Routine.addCommas(pre_fact, " ")%></b></td>
    <td><b><%=(pre_fact_weight)?Routine.addCommas(pre_fact_weight.toFixed(3).toString(), " "): '-' %></b></td>
    <td class = "black-border"><b><%=(pre_fact_time)?Routine.hhmmss(pre_fact_time): '-' %></b></td>
    <!--Факт текущий-->
    <td><b><%=Routine.addCommas(fact, " ")%></b></td>
    <td><b><%=(fact_weight)?Routine.addCommas(fact_weight.toFixed(3).toString(), " "): '-' %></b></td>
    <td><b><%=(fact_time)?Routine.hhmmss(fact_time): '-' %></b></td>
    <td></td>
  </tr>
</script>

<!--ШАБЛОН ФОРМЫ СОЗДАНИЯ ЗАДАНИЙ ПО НЕДОСДАЧЕ-->
<script id="newShiftTaskDlgTemplate" type="text/template">
  <div id="position-modal">
  <div class="modal new-shift-task-dlg" style = "position:relative; margin-top: 40px;">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Перенести недосдачу на новую смену?</h5>
    </div>
    <div class="modal-body form-horizontal" style = "max-height: none">
      <!-- таблица с объемами-->
      <div class="line">
        <table class="in-info">
            <thead>
              <tr>
                <td style="width:100px;">Артикул</td>
                <td style="">Название</td>
                <td style="width:100px;">Объем, шт.</td>
              </tr>
            </thead>
            <tbody>
            <% _.each(obj.get('items').models, function (item) {
                    var balanceVal = Routine.strToFloat(item.get('count')['value'].toString());
                    if(isNaN(balanceVal))
                      balanceVal = 0;
                    var factScopeVal = 0;
                    if(item.get('fact') &&item.get('fact')['value'])
                      factScopeVal = item.get('fact')['value'];
                    var preFactScopeVal = 0;
                    if(item.get('pre_fact') &&item.get('pre_fact')['value'])
                      preFactScopeVal = item.get('pre_fact')['value'];
                    // рассчет баланса
                    balanceVal =balanceVal - factScopeVal-preFactScopeVal;
                    if(balanceVal>0)
                    {%>
                    <tr>
                      <td><%=item.get('number')%></td>
                      <td><%=item.get('name')%></td>
                      <td><%=balanceVal%></td>
                    </tr>

                    <%}
                });%>
            </tbody>
        </table>
      </div>
      <!--календарь-->
      <div class="line">
        <div class="date-picker" style = "margin-right:30px; text-align:right;"></div>
      </div>
      <!--примечание-->
      <div class="line">
        <textarea  type="text" rows="3" placeholder="Введите примечание" class="note" ></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <div class="control-group">
        <div class="controls">
          <a href="javascript:;" class="btn btn-primary btn-save">Да</a>
          <a href="javascript:;" class="btn btn-no-save">Нет</a>
          <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
        </div>
      </div>
    </div>
  </div>
  </div>
</script>

<!--ШАБЛОН ИСТОРИИ ФАКТОВ ПО ЭЛЕМЕНТУ-->
<script id="factHistoryItemsTemplate" type="text/template">
  <td colspan = "3" style = "background-color: #FAFAF0"></td>
  <td colspan = "11" style = "background-color: #FAFAF0">
    <table class = 'in-info'>
      <thead>
        <tr style = "background-color: whitesmoke;">
          <td style="width:20%">Дата ввода</td>
          <td style="width:20%">Факт</td>
          <td style="width:10%">Полн. вес, кг</td>
          <td style="width:10%">Время, чч:мм</td>
          <td style="">Пользователь</td>
        </tr>
      </thead>
      <tbody class = "facts-data-list">
      </tbody>
    </table>
  </td>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА ИСТОРИИ ПО ФАКТАМ -->
<script id="factHistoryItemTemplate" type="text/template">
  <td><%=moment.utc(date, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%></td>
  <td><%=Routine.addCommas(value.toFixed(3).toString()," ")%></td>
  <td style = "white-space: nowrap;"><%=(fact_weight)?Routine.addCommas(fact_weight.toFixed(3).toString(), " "): '-' %></td>
  <td style = "white-space: nowrap;"><%=(fact_time)?Routine.hhmmss(fact_time): '-' %></td>
  <td><%=user%></td>
  </script>

<!--ОСНОВНАЯ ФОРМА-->
<div id="shift_task_facts" style = "display:none">
    <div  class="span12" style = "margin-top:30px; width: 98%;">
      <div class="navbar" id="navigationButtons">
        <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
          <div class="input-prepend input-append" >
            <span class="add-on"><b class="fa fa-calendar-o"></b>&nbsp;Дата смены:</span>
            <div class="input-append date date-picker" style = "margin-right:10px;">
              <input class ='tb-date tb-search-date' type="text" class="span2"  value = "" disabled><span class="add-on"><i class="icon-th"></i></span>
            </div>
            <button class="btn btn-success btn-search" id = "btn_search" >Открыть</button>
          </div>
        </div>
      </div>
    </div>
    <div id = "shift_task_facts_body" class="data-body">
      <div class = "line data-container css-treeview"  id = "shift_task_facts_data_container"></div>
    </div>
</div>
<div id = "section-to-print"></div>
