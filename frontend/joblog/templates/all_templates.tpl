<!--ШАБЛОН ЗАГОЛОВКА ЖУРНАЛА РАБОТ===============================================================-->
<script id="jobLogHeader" type="text/template">
  <%
    var product_unit_number = "";
    if('production_units' in obj){
      if(obj['production_units'].length>1)
        product_unit_number="*";
      else
        product_unit_number = obj['production_units'][0]['unit_number'];
    }%>
  <h4>Отчетная дата: <%=factDate.replace('/','.').replace('/','.') %></h4>
  <h5>
    Заказ: <%=contract_number + '.' + product_number+ '.' + product_unit_number + ' ' + product_name%><br>
    <%='Участок: ' + sector_name + ' (код: '+sector_code+')'%><br>
    Наряд: <%=number%>
  </h5>

</script>

<!--Шаблон элемента выпадающего спика участков-->
<script id="filterItemTemplateSector" type="text/template">
    <option value = "<%=code%>" <%=(checked)?"selected":""%>  ><%="[" + code + "] " + name%></option>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА РАБОТЫ=======================================================================-->
<script id="jobLogWorkItem" type="text/template">
  <input type = 'hidden' value = "<%=id%>" />
  <div class = "item" style = "width:6%">
    <span style = "float: left; margin: 4px 0px 0px 0px;"><%=code%></span>
    <input
      type="checkbox"
      class = "cb cb-mark-as-rejected"
      title = "Работа выполнялась с отклонением"
      style = "display: none; margin-left: 15px;"
      <%=(status=='on_work_with_reject')?'checked':'' %>
      <%=(status!='on_work' && status!='on_work_with_reject')?'disabled':'' %>
    />

  </div>
  <div class = "item" style = "width:34%"><%=name%></div>
  <div class = "item" style = "width:8%;"><%=unit%></div>
  <div class = "item" style = "width:10%">
    <input type="hidden" class = "tb tbPlane" value = "<%=plan_scope%>" disabled  />
    <span class = 'lbl'><%=Routine.addCommas(plan_scope.toFixed(3).toString()," ")%></span>
  </div>
  <div class = "item" style = "width:10%;">
    <input type="hidden" class = "tb tbBalance" value = "<%=Routine.addCommas((balance).toFixed(3).toString()," ")%>"  disabled  />
    <span class = 'lbl'><%=Routine.addCommas((balance).toFixed(3).toString()," ")%></span>
  </div>
  <div class = "item" style = "width:15%; white-space: nowrap;" >
    <input
      type="text"
      class = "tb tbFact"
      placeholder="(0-простой)"
      <%=(status=='completed')?'disabled':'' %>
      value="<%=(status=='completed')?Routine.addCommas((plan_scope-balance).toFixed(3).toString()," "):''%>"
    />
  </div>
  <div class = "item pnl-extra-functions" style = "width:12%; display: none" >
    <label style = "float: left">
      <input
        type="checkbox"
        class = "cb cb-mark-as-completed"
        <%=(status=='completed')?'disabled':'' %>
        <%=(status=='completed')?'checked':'' %>
        />
        <span  style = "float:left; margin-top: 3px;">&nbsp;выполнена</span>
    </label>
    <span
      class = "lnk lnk-transfer-fact"
      title="Зачесть из другого..."
      style = "margin-left:10px; float: left;<%=(status=='completed')?'display: none;':'' %>"
      >
      <i class="fa fa-retweet" style="padding-top: 5px;"></i>
    </span>
    <input
      style = "display: none"
      type="checkbox"
      class = "cb cb-repeat-operation"
      title="Повторить статус с другой причиной"
      style = "<%=(status=='completed' || status=='on_work' || status=='')?'display:none':'' %>"
    />
  </div>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА ИСТОРИИ ПО ФАКТАМ===========================================================-->
<script id="factWorkHistoryItemTemplate" type="text/template">
  <td><%=moment.utc(date, 'YYYY-MM-DD').format('DD.MM.YYYY')%></td>
  <td><%=code%></td>
  <td title = <%=note%>><%=name%></td>
  <td><%=unit%></td>
  <td><%=Routine.addCommas(plan_scope.toFixed(3).toString()," ")%></td>
  <td><%=Routine.addCommas((balance).toFixed(3).toString()," ")%></td>
  <td><%=Routine.addCommas(fact_scope.toFixed(3).toString()," ")%></td>
  <td><%=App.Statuses[status]%></td>
  <td><%=moment.utc(date_change, 'YYYY-MM-DDTHH:mm:ss').local().format('DD.MM.YYYY HH:mm:ss')%></td>
  <td><%=user_email%></td>
</script>

<!--ШАБЛОН ФОРМЫ ДИАЛОГА ПЕРЕЗАЧЕТА ФАКТА========================================================-->
<script id="transferFactDialogTemplate" type="text/template">
  <div class="modal transfer-fact-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Зачет факта из другого наряда</h5>
    </div>
    <div class="modal-body form-horizontal">
      <div class="line" style = "border-bottom:dashed 1px #ccc">
        <span>Зачесть факт из: </span>
        <input type="text" placeholder="наряд/работа"  style="width:100px;"  class="tbLinkedWork" />
        <input type="text" placeholder="объем" style="width:100px;" class="tbFact" />
        <span><%=unit%></span>
      </div>
      <div class="line">
          <textarea  type="text" rows="3" placeholder="Введите примечание" class="note" ></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <div class="control-group">
          <div class="controls">
              <a href="javascript:;" class="btn btn-primary btn-save">Зачесть</a>
              <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
          </div>
      </div>
    </div>
  </div>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА МАТЕРИАЛА====================================================================-->
<script id="planNormMaterialItem" type="text/template">
  <div class = "item" style = "width:8%"><%=group_code + "." +code +((unique_props_key)?"." + unique_props_key.toString():'') %></div>
  <div class = "item" style = "width:37%"><%=name%></div>
  <div class = "item" style = "width:22%"><%=((unique_props_key)?unique_props_name:"")%></div>
  <div class = "item" style = "width:7%;"><%=unit_pto%></div>
  <div class = "item" style = "width:7%; ">
    <input type="hidden" class = "tb tbPlane" value = "<%=plan_scope%>" disabled  />
    <span class = 'lbl'><%=Routine.addCommas(plan_scope.toFixed(3).toString()," ")%></span>
  </div>
  <div class = "item" style = "width:7%;">
    <input type="hidden" class = "tb tbBalance" value = "<%=Routine.addCommas((balance).toFixed(3).toString()," ")%>"  disabled  />
    <span class = 'lbl'><%=Routine.addCommas((balance).toFixed(3).toString()," ")%></span>
  </div>
  <div class = "item" style = "width:7%"><input type="text" class = "tb tbFact" <%=(balance==0)?'disabled':'' %>  value="<%=((balance==0))?Routine.addCommas((plan_scope-balance).toFixed(3).toString()," "):''%>" /></div>
</script>

<!--ШАБЛОН КОНТЕЙНЕРА ТРУДОВОГО УЧАСТИЯ==========================================================-->
<script id = "pnl_workers_container_template" type="text/template">
  <div class = "data-header-container" style = "margin-top:20px;">
    <div class = "data-header">
      <div class = "item" style = "width:44%">ФИО рабочего</div>
      <div class = "item" style = "width:15%">&nbsp;Кол-во часов</div>
      <div class = "item" style = "width:46%">
        <label class="checkbox" style="float:left; display: none;">
          <input type="checkbox" <%= !obj?'style="display:none"':'' %> class="auto-ktu" <%= (obj && obj.auto_ktu)?'':'' %> />Авто КТУ</label>&nbsp; &nbsp; &nbsp;
        <button type="button" id="btnAddWorker" class="btn btn-worker-equally" style="display: none; float:right;" <%= (obj && obj.auto_ktu)?'disabled':'' %>><i class="fa fa fa-group"></i>&nbsp;Всем поровну</button>
      </div>
      <!-- <div class = "item" style = "width:10%"></div> -->
    </div>
  </div>
  <div class="line data-container data-workers-container" style="margin-top:10px;" >
  </div>
  <div class = "data-header-container">
    <div class = "data-header">
      <div class = "item" style = "width:44%"></div>
      <div class = "item" style = "width:15%">&nbsp;
        <span style = "display: none" class = "lbl lbl-full-percent">100 из 100%</span>
      </div>
      <div class = "item" style = "width:36%"></div>
      <div class = "item" style = "width:10%"></div>
    </div>
  </div>
  <div class="line" style="margin:10px 0px 10px 0px">
    <button type="button" id="btnAddWorker" class="btn btn-add-worker" style="float:left; margin-right:10px;"><i class="fa fa fa-user-plus"></i>&nbsp;Добавить работника</button>
    <div style="float:right; margin-right:10px; display: none">
      <span class="lbl font16 lbl-search-workorder">Взять работников из наряда:</span>
      <div style = "float:left;">
        <input type="text"  class="tb-search-workorder"  />
      </div>
    </div>
  </div>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА ТРУДОВОГО УЧАСТИЯ============================================================-->
<script id="workerItem" type="text/template">
  <div class = "item <%=proportion>8?'error':''%>" style = "width:44%">
    <input type = "text" class = "tb fio" value = "<%=user_fio%>" />
  </div>
  <div class = "item <%=proportion>8?'error':''%>" style = "width:15%;">
    <input type="text" style = "width:50px; float: left" class="tb-chance-value" tabindex="1"  value = "<%= proportion %>" />
    <label class="control-label" style = "float:left; margin-left:6px; font-size:14px; margin-top:4px;" >
      <strong class="chance-value"></strong>
    </label>
  </div>
  <div class = "item propportion-slider-box <%=proportion>8?'error':''%>" style = "width:36%; <%=(proportion===0)?'display:none':''%>">
      <button type = "button" class = "btn lnk-minus-qty" title="-1ч" style = "float:left; margin-right:15px; margin-left:10px;">-1</button>
      <div style = "float:left;">
        <input type="text" style = "width:200px;" class="span4 chance-slider" data-slider-min="0" data-slider-tooltip="hide" data-slider-max="24" data-slider-step="1" data-slider-value="<%= proportion %>" style = "float:left" />
      </div>
      <button type = "button" class = "btn lnk-plus-qty" title="+1ч" style = "float:left; margin-left:15px;">+1</button>
  </div>
  <div class = "item time-sheet-reason-box" style = "padding-top:0px!important; width:36%; <%=(proportion!==0)?'display:none':''%>">
    <div class="form-inline" style = "padding-left: 10px;">
      <span style = "font-size: 11px; padding: 3px 2px; color: #999;">Причина отсутствия:</span>
      <select style="width:315px;" class="absence-reason" data-val="1"></select>
    </div>
  </div>
  <div class = "item <%=proportion>8?'error':''%>" style = "width:5%;">
    <button type = "button" class = "btn lnk-remove-item" style = "float:right;" title="удалить работника с формы"><i class="fa fa-remove"></i>
    </button>
  </div>
</script>

<!--ШАБЛОН ЭЛЕМЕНТА ИСТОРИИ ТРУДОВГО УЧАСТИЯ=====================================================-->
<script id="worker_history_item" type="text/template">
  <div class = "date"><%=moment.utc(fact_date, 'YYYY-MM-DD').format('DD.MM.YYYY')%></div>
  <div class = "data-items">
  <%for(var i in workers){
    var worker = workers[i];%>
    <div class = "data-item">
      <div class = "item" style = "width:85%">
        <span class = "lbl"><%=worker['user_fio']%></span>
      </div>
      <div class = "item" style = "width:15%">
        <span class = "lbl"><%=worker['proportion']%>ч</span>
      </div>
    </div>
  <%}%>
  </div>
  <div class = 'buttons' style = "<%=(!has_access('joblog','o')?'display:none':'')%>">
    <button type="button" class = "btn btn-edit" ><i class="fa fa-pencil"></i>&nbsp;Редактировать</button>
    <button type="button" class = "btn btn-remove" ><i class="fa fa-remove"></i>&nbsp;Удалить</button>
  </div>
</script>
<script id="worker_history_item_edit" type="text/template">
  <div class = "date" style="margin:10px 0px 10px 0px">Редактирование трудового участия на: <%=moment.utc(fact_date, 'YYYY-MM-DD').format('DD.MM.YYYY')%></div>
  <div class="line data-box" style="margin:10px 0px 10px 0px">
  </div>
  <div class = 'buttons' style = "<%=(!has_access('joblog','o')?'display:none':'')%>">
    <button type="button" class = "btn btn-ok" ><i class="fa fa-save"></i>&nbsp;Сохранить</button>
    <button type="button" class = "btn btn-cancel" >Отмена</button>
  </div>
</script>

<!--ШАБЛОН ФОРМЫ ПЕРЕНОСА СРОКОВ НАРЯДА==========================================================-->
<script id="dateTransferItem" type="text/template">
  <div class = "line" style = "margin:15px 0px 15px 0px"><span class = "lbl2"><%=code + ". " + name%></span></div>
  <!--deprecated-->
  <div class = "line" style="display: none">
    <div class = "item left" >Перенести на:</div>
    <div class = "item">
      <input class = "tb tb-shift-value" style = "width:50px; display:none;" value = <%=shift%> disabled />
      <div class="input-append date date-picker">
        <input class ='tbDate' type="text" class="span2"  value = ""  disabled><span class="add-on"><i class="icon-th"></i></span>
      </div>
    </div>
  </div>
  <div class = "line" style="display: none">
    <div class = "item left">Тип переноса:</div>
    <div class = "item">
      <select class="selectpicker ddl-date-transfer-type" disabled>
        <option value = "">Тип переноса</option>
        <option <%=type=='start'?'selected':''%>  value = "start">Дата начала работ</option>
        <option <%=type=='finish'?'selected':''%> value = "finish">Дата окончания работ</option>
        <option <%=type=='both'?'selected':''%> value = "both">Обе даты вместе</option>
      </select>
    </div>
  </div>
  <!---->
  <div class="line">
    <div class = "item">Дата факта:&nbsp;<%=fact_date.format("dd/mm/yyyy")%></div>
  </div>
  <div class="line">
    <div class = "item">Дата плана (окончание):&nbsp;<%=plan_date.format("dd/mm/yyyy")%></div>
  </div>
  <div class="line">
    <div class = "item">Факт превышает план - опоздание.</div>
  </div>
  <div class = "line">&nbsp;</div>
  <div class = "line">
    <div class = "item left">Выберите причину:</div>
    <div class = "item"><select class="selectpicker ddl-date-transfer-reason" style = "width:400px;"></select></div>
  </div>
  <div class = "line reason-note transfer-reason-note" style = "display:none">
    <div class = "item left">Уточнение причины:</div>
    <div class = "item">
      <input type = "text" class = "tb-reason-note "style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
    </div>
  </div>
  <div class = "line">
    <div class = "item left">Комментарий:</div>
    <div class = "item"><textarea class = "tb-note tb-transfer-note" rows="2" style = "width:500px;"></textarea></div>
  </div>
</script>
<!--HoldItem-->
<script id="holdItem" type="text/template">
  <div class = "line" style = "margin:15px 0px 15px 0px"><span class = "lbl2"><%=code + ". " + name%></span></div>
  <div class = "line">
    <div class = "item left">Причина простоя:</div>
    <div class = "item"><select class="selectpicker ddl-hold-reason" style = "width:400px;"></select></div>
  </div>
  <div class = "line reason-note hold-reason-note" style = "display:none">
    <div class = "item left">Уточнение причины:</div>
    <div class = "item">
      <input type = "text" class = "tb-reason-note "style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
    </div>
  </div>
  <div class = "line">
    <div class = "item left">Комментарий:</div>
    <div class = "item"><textarea class = "tb-note" rows="2" style = "width:500px;"></textarea></div>
  </div>
</script>
<!--PauseItem-->
<script id="pauseItem" type="text/template">
  <div class = "line" style = "margin:15px 0px 15px 0px"><span class = "lbl2"><%=code + ". " + name%></span></div>
  <div class = "line">
    <div class = "item left">Причина приостановки:</div>
    <div class = "item"><select class="selectpicker ddl-pause-reason" style = "width:400px;"></select></div>
  </div>
  <div class = "line reason-note pause-reason-note" style = "display:none">
    <div class = "item left">Уточнение причины:</div>
    <div class = "item">
      <input type = "text" class = "tb-reason-note"style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
    </div>
  </div>
  <div class = "line">
    <div class = "item left">Комментарий:</div>
    <div class = "item"><textarea class = "tb-note" rows="2" style = "width:500px;"></textarea></div>
  </div>
</script>

<!--RejectItem-->
<script id="rejectItem" type="text/template">
  <div class = "line" style = "margin:15px 0px 15px 0px"><span class = "lbl2"><%=code + ". " + name%></span></div>
  <div class = "line">
    <div class = "item left">Причина отклонения:</div>
    <div class = "item"><select class="selectpicker ddl-reject-reason" style = "width:400px;"></select></div>
  </div>
  <div class = "line reason-note reject-reason-note" style = "display:none">
    <div class = "item left">Уточнение причины:</div>
    <div class = "item">
      <input type = "text" class = "tb-reason-note "style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
    </div>
  </div>
  <div class = "line">
    <div class = "item left">Комментарий:</div>
    <div class = "item"><textarea class = "tb-note" rows="2" style = "width:500px;"></textarea></div>
  </div>
</script>

<!--ШАБЛОН ФОРМЫ НАСТРОЕК ОТЧЕТА=================================================================-->
<script id="downloadSettingsForm" type="text/template">
  <div class="modal download-settings-form">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Настройка условий выгрузки</h5>
    </div>
    <div class="modal-body form-horizontal">
       <div class="control-group group-sectors" style = "display:none;">
        <label class="control-label">Участок:</label>
        <div class="controls">
          <select class="ddl-sectors"   multiple="multiple"  style = "display:none"></select>
        </div>
      </div>
      <div class="control-group group-teams">
        <label class="control-label">Бригада:</label>
        <div class="controls">
          <select class="ddl-teams"   multiple="multiple"  style = "display:none"></select>
        </div>
      </div>
      <div class="control-group group-years">
        <label class="control-label">Год:</label>
        <div class="controls">
          <select class="ddl ddl-years"  style = "display:none"></select>
        </div>
      </div>
      <div class="control-group group-months">
        <label class="control-label">Месяц:</label>
        <div class="controls">
          <select class="ddl ddl-months" style = "display:none">
            <option value = "1">Январь</option>
            <option value = "2">Февраль</option>
            <option value = "3">Март</option>
            <option value = "4">Апрель</option>
            <option value = "5">Май</option>
            <option value = "6">Июнь</option>
            <option value = "7">Июль</option>
            <option value = "8">Август</option>
            <option value = "9">Сентябрь</option>
            <option value = "10">Октярь</option>
            <option value = "11">Ноябрь</option>
            <option value = "12">Декабрь</option>
          </select>
        </div>
      </div>
      <div class="control-group group-view-type">
        <label class = "control-label"><input id="data-symple-view" type="checkbox" style = "float:left;"><span style = "float:left; margin: 1px 0px 0px 3px;">Плоские данные</span></label>
        <label class = "control-label" ><input id="data-include-not-completed" type="checkbox" style = "float:left;"><span style = "float:left; margin: 1px 0px 0px 3px;">Не закрытые наряды</span></label>
      </div>
    </div>
    <div class="modal-footer">
      <a href="javascript:;" class="btn btn-primary btn-save">Скачать</a>
      <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
    </div>
  </div>
</script>
<!--ШАБЛОН ЭЛЕМЕНТА ФИЛЬТРАЦИИ ПО УЧАСТКУ========================================================-->
<script id="filterItemTemplateSector" type="text/template">
  <option value = "<%=code%>" ><%="[" + code + "] " + name%></option>
</script>
<!--ШАБЛОН ЭЛЕМЕНТА ФИЛТРАЦИИ ПО БРИГАДЕ=========================================================-->
<script id="filterItemTemplateTeam" type="text/template">
  <option value = "<%=_id%>" ><%="[" + code + "]&nbsp;" + teamlead%></option>
</script>

<!--PAGER========================================================================================-->
<script type="text/template" id="pagerTemplate">
  <div class="list-pager" style = "<%=(count>1)?'':'display:none'%>">
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

<!--=========WORKORDER LIST=====================-->
<script id="listWorkOrderItemTemplate" type="text/template">
  <td><a href="/joblog#number/<%=number%>" class = "lnk lnk-number"><%=number%></span></td>
  <td>[<%=sector_code%>] <%=sector_name%></td>
  <td><%=sector_type%></td>
  <td><%=order_number%></td>
  <td><%=fact_info%></td>
</script>
