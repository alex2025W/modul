%def scripts():
	<link href="/static/css/newjoblog.css?v={{version}}" rel="stylesheet" media="screen, print">
	<link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen, print">
	<link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen, print">
	<link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen, print">
 	 <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
 	<script src="/static/scripts/routine.js?v={{version}}"></script>
 	<script src="/static/scripts/newjoblog/app.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootstrap-slider.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
	<script>
		$(function() {
			bootbox.setDefaults({locale: "ru"});
			App.initialize({{! sectors }},{{! teams }},{{! planshiftreason_system_objects }},{{! all_workers }}, {{! weekends }});
		});
	</script>
%end

%rebase master_page/base page_title='Новый журнал работ', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--Work item-->
<script id="jobLogWorkItem" type="text/template">
	<input type = 'hidden' value = "<%=id%>" />
	<div class = "item" style = "width:10%"><%=code%></div>
	<div class = "item" style = "width:36%"><%=name%></div>
	<div class = "item" style = "width:8%;"><%=unit%></div>
	<div class = "item" style = "width:8%">
		<input type="hidden" class = "tb tbPlane" value = "<%=plan_scope%>" disabled  />
		<span class = 'lbl'><%=Routine.addCommas(plan_scope.toFixed(3).toString()," ")%></span>
	</div>
	<div class = "item" style = "width:8%;">
		<input type="hidden" class = "tb tbBalance" value = "<%=Routine.addCommas((Math.abs(balance)).toFixed(3).toString()," ")%>"  disabled  />
		<span class = 'lbl'><%=Routine.addCommas((Math.abs(balance)).toFixed(3).toString()," ")%></span>
	</div>
	<div class = "item" style = "width:8%"><input type="text" class = "tb tbFact" <%=(status=='completed' || status == 'on_hold' || status == 'on_pause')?'disabled':'' %>  value="<%=(status=='completed')?Routine.addCommas((plan_scope-balance).toFixed(3).toString()," "):''%>" /></div>
	<div class = "item" style = "width:17%">
		<select class = "ddl ddl-status" <%=(status=='completed')?'disabled':'' %>  >
			<option value = "on_work" <%=(status=='' || status=='on_work')?'selected':'' %> >В работе</option>
			<option value = "completed" <%=(status=='completed')?'selected':'' %> >Выполнена</option>
			<option value = "on_pause" <%=(status=='on_pause')?'selected':'' %> >Приостановлена</option>
			<option value = "on_hold" <%=(status=='on_hold')?'selected':'' %> >Простой</option>
		</select>
		<input type="checkbox" class = "cb cb-repeat-operation" title="Повторить статус с другой причиной"  style = "<%=(status=='completed' || status=='on_work' || status=='')?'display:none':'' %>" />
	</div>
</script>

<!--Material item-->
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
		<input type="hidden" class = "tb tbBalance" value = "<%=Routine.addCommas((Math.abs(balance)).toFixed(3).toString()," ")%>"  disabled  />
		<span class = 'lbl'><%=Routine.addCommas((Math.abs(balance)).toFixed(3).toString()," ")%></span>
	</div>
	<div class = "item" style = "width:7%"><input type="text" class = "tb tbFact" <%=(balance==0)?'disabled':'' %>  value="<%=((balance==0))?Routine.addCommas((plan_scope-balance).toFixed(3).toString()," "):''%>" /></div>
</script>

<script id = "pnl_workers_container_template" type="text/template">
	<div class="line" style="margin:10px 0px 10px 0px">
		<button type="button" id="btnAddWorker" class="btn btn-add-worker" style="float:left; margin-right:10px;"><i class="fa fa fa-user-plus"></i>&nbsp;Добавить работника</button>
		<div style="float:right; margin-right:10px;">
			<span class="lbl font16 lbl-search-workorder">Взять работников из наряда:</span>
			<div style = "float:left;">
				<input type="text"  class="tb-search-workorder"  />
			</div>
		</div>
	</div>
	<div class = "data-header-container" style = "martin-top:20px;">
		<div class = "data-header">
			<div class = "item" style = "width:44%">ФИО рабочего</div>
			<div class = "item" style = "width:15%">&nbsp;Доля участия</div>
			<div class = "item" style = "width:36%"><button type="button" id="btnAddWorker" class="btn btn-worker-equally" style="float:left;"><i class="fa fa fa-group"></i>&nbsp;Всем поровну</button></div>
			<div class = "item" style = "width:10%"></div>
		</div>
	</div>
	<div class="line data-container data-workers-container" style="margin-top:10px;" >
	</div>
	<div class = "data-header-container">
		<div class = "data-header">
			<div class = "item" style = "width:44%"></div>
			<div class = "item" style = "width:15%">&nbsp;<span class = "lbl lbl-full-percent">100 из 100%</span></div>
			<div class = "item" style = "width:36%"></div>
			<div class = "item" style = "width:10%"></div>
		</div>
	</div>
</script>

<!--Worker item-->
<script id="workerItem" type="text/template">
	<div class = "item" style = "width:44%">
		<input type = "text" class = "tb fio" value = "<%=user_fio%>" />
	</div>
	<div class = "item" style = "width:15%;">
		<label class="control-label" style = "float:left; margin-left:10px; font-size:16px;" ><strong class="chance-value"><%= proportion?(proportion+" %"):"не определено" %></strong></label>
	</div>
	<div class = "item" style = "width:36%">
			<button type = "button" class = "btn lnk-minus-qty" title="-1%" style = "float:left; margin-right:15px; margin-left:10px;">-1</button>
			<div style = "float:left;">
				<input type="text" style = "width:200px;" class="span4 chance-slider" data-slider-min="0" data-slider-tooltip="hide" data-slider-max="100" data-slider-step="1" data-slider-value="<%= proportion %>" style = "float:left" />
			</div>
			<button type = "button" class = "btn lnk-plus-qty" title="+1%" style = "float:left; margin-left:15px;">+1</button>
	</div>
	<div class = "item" style = "width:5%;"><button type = "button" class = "btn lnk-remove-item" style = "float:right;" title="удалить работника с формы"><i class="fa fa-remove"></i></button></div>
</script>

<!--Workers history item-->
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
				<span class = "lbl"><%=worker['proportion']%>%</span>
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

<!--Header-->
<script id="jobLogHeader" type="text/template">
	<h4 ><%='Заказ №'+production_order_number +' ['+product['number']+  ']; Участок: ' + sector['name']%></h4>
</script>

<!--DateTransferItem-->
<script id="dateTransferItem" type="text/template">
	<div class = "line" style = "margin:15px 0px 15px 0px"><span class = "lbl2"><%=code + ". " + name%></span></div>
	<div class = "line">
		<div class = "item left" >Перенести на:</div>
		<div class = "item">
			<input class = "tb tb-shift-value" style = "width:50px; display:none;" value = <%=shift%> disabled />
			<div class="input-append date date-picker">
				<input class ='tbDate' type="text" class="span2"  value = ""  disabled><span class="add-on"><i class="icon-th"></i></span>
			</div>
		</div>
		<!--<div class = "item" >дней</div>-->
	</div>
	<div class = "line">
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
	<div class = "line">
		<div class = "item left">Причина переноса:</div>
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
		<div class = "item"><textarea class = "tb-note" rows="2" style = "width:500px;"></textarea></div>
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

<!--DOWNLOAD SETTINGS FORM-->
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
                <label class = "control-label" style = "display:none"><input id="data-symple-view" type="checkbox" style = "float:left;"><span style = "float:left; margin: 1px 0px 0px 3px;">Плоские данные</span></label>
                <label class = "control-label" ><input id="data-include-not-completed" type="checkbox" style = "float:left;"><span style = "float:left; margin: 1px 0px 0px 3px;">Не закрытые наряды</span></label>
            </div>
        </div>
        <div class="modal-footer">
            <a href="javascript:;" class="btn btn-primary btn-save">Скачать</a>
            <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
        </div>
    </div>
</script>

<script id="filterItemTemplateSector" type="text/template">
    <option value = "<%=code%>" ><%="[" + code + "] " + name%></option>
</script>

<script id="filterItemTemplateTeam" type="text/template">
    <option value = "<%=_id%>" ><%="[" + code + "]&nbsp;" + teamlead%></option>
</script>


<div id="joblog" >
	<div class = "row hidden-print">
		<div  class="span12" style = "width:100%;">
			<div class="navbar">
				<div  id = "pnlJobLogFilter" class="navbar-inner" style=  "padding-top:10px" >
					<div class="input-prepend input-append">
						<span class="add-on"><b class="icon-list-alt"></b></span>
						<input type="text" class="filter-number" id = "tbWorkOrderNumber"  placeholder="введите номер наряда" />
						<button id= "btnJobLogFind" class="btn btn-primary btn-filter">Открыть</button>
					</div>
					<button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; margin-left:10px;"  ><i class="fa fa-cloud-download"></i>&nbsp;Скачать все</button>
					<button type="button" id="btnDownloadQStat" class="btn btn-download-qstat" style = "float:right;"  ><i class="fa fa-download"></i>&nbsp;Скачать</button>
				</div>
			</div>
		</div>
	</div>
	<div id="pnlJobLogBody" class="joblog-body" style = "display:none">
		<div class="lbl-header">
			<div class = "lbl"></div>
			<div class = 'crl'>
				<select class = "ddl ddl-common-status">
					<option value = "">Общий статус</option>
					<option value = "on_work">В работе</option>
					<option value = "on_pause">Приостановлена</option>
					<option value = "on_hold" >Простой</option>
				</select>
			</div>
		</div>
		<div class = "data-header-container">
			<div class = "data-header">
				<div class = "item" style = "width:10%">Код</div>
				<div class = "item" style = "width:36%">Наименование</div>
				<div class = "item" style = "width:8%;">Ед.</div>
				<div class = "item" style = "width:8%;">План</div>
				<div class = "item" style = "width:8%;">Остаток</div>
				<div class = "item" style = "width:8%">Факт</div>
				<div class = "item" style = "width:17%;">Статус</div>
			</div>
		</div>
		<div class = "line data-container" id="pnlJobLogDataContainer">
		</div>
		<div class = "line" style = "margin-top:20px;">
			<span class = "lbl"><b>Исполнитель:</b></span>
		</div>
		<div class = "line">
			<select class="selectpicker ddl-brigade" id="filter-type"></select>
		</div>
		<div class = "line">
			<span class = "lbl"><b>Дата выполнения работ:</b></span>
		</div>
		<div class = "line">
			<div class="input-append date date-picker">
				<input class ='tbDate' type="text" class="span2"  value = ""  disabled><span class="add-on"><i class="icon-th"></i></span>
			</div>
		</div>
		<div class = "line" style = "margin-top:10px;">
			<label style = "float:left"><input type="checkbox" class = "cb cb-weekend" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left;">Внерабочее время</span></label>
		</div>
		<!-- Изделия-->
		<div class="lbl-header1 lbl-materials-header" style = "margin-top:20px; display:none;">
			Изделия
		</div>
		<div class = "data-header-container">
			<div class = "data-header data-materials-header" style ="margin-top:10px; display:none;">
				<div class = "item" style = "width:8%">Арт.</div>
				<div class = "item" style = "width:37%">Наименование</div>
				<div class = "item" style = "width:22%">Инд. хар.</div>
				<div class = "item" style = "width:7%;">Ед.</div>
				<div class = "item" style = "width:7%;">План</div>
				<div class = "item" style = "width:7%;">Остаток</div>
				<div class = "item" style = "width:7%">Факт</div>
			</div>
		</div>
		<div class = "line data-container data-materials-container" style = "display:none" id="pnlMaterialsDataContainer"></div>
		<!-- Трудовое участия, форма добавления новой записи-->
		<div class = "line">
			<div class="lbl-header1 lbl-workers-header" style="margin-top:30px;">
				<span style="float:left;">Добавить трудовое участие</span>
			</div>
		</div>
		<div class = "line pnl-add-workers-container" id = "pnlAddWorkersContainer"></div>
		<!-- Панель с кнопками-->
		<div class = 'control-panel'>
			<input type="button" class = "btn btnOk" value = "Сохранить"  />
			<input type="button" class = "btn btnCancel" value = "Отмена"  />
		</div>
		<!-- Трудовое участия, форма истории-->
		<div class="line pnl-workers-history-container" id="pnlWorkersHistoryContainer" >
			<div class="lbl-header1 lbl-workers-history-header" style="margin-top:30px;">
				<span style="float:left;">Трудовое участие (история)</span>
			</div>
			<div class = "data-header-container" style = "margin-top:20px;">
				<div class = "data-header">
					<div class = "item" style = "width:85%">ФИО рабочего</div>
					<div class = "item" style = "width:15%">&nbsp;Доля участия</div>
				</div>
			</div>
			<div class="line data-container data-workers-history-container" style="margin-top:10px;" id="pnlWorkersHistoryDataContainer">
			</div>
		</div>
	</div>
	<div id="pnlTransferDate" style = "display:none">
		<!--TRANSFER DATES-->
		<div class = "line pnl-transfer-works">
			<div class = "line"> <h4 >Перенос плановых дат.</h4></div>
			<div class = "line pnl-transfer-header-type" style = "display:none">
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-transfer-individual-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Разные причины на разные работы</span></label>
				</div>
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-transfer-common-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Общая причина на все работы</span></label>
				</div>
			</div>
			<div class = "line pnl-transfer-header" style = "display:none;">
				<div class = 'line'>
					<span class = "lbl2" style = "margin:3px 10px 0px 0px"><b>Общая причина переноса:</b></span>
					<select class="selectpicker ddl-own-date-transfer-reason" id="own-date-transfer-reson" style = "width:400px;">
						<option>причина переноса</option>
					</select>
				</div>
				<div class = "line reason-note transfer-reason-common-note" style = "display:none">
					<span class = "lbl2" style = "margin:3px 56px 0px 0px"><b>Уточнение причины:</b></span>
					<input type = "text" class = "tb-reason-note tb-transfer-reason-common-note"style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
				</div>
				<div class = "line">
					<span class = "lbl2" style = "margin:3px 49px 0px 0px"><b>Общий комментарий:</b></span>
					<textarea class = "tb-note tb-transfer-common-note" rows="2" style = "width:500px;"></textarea>
				</div>
			</div>
			<div class = "line data-container transfer-data-container" id="pnlTransferDateDataContainer" style = "display:none"></div>
		</div>
		<!--HOLDS WORKS-->
		<div class = "line pnl-hold-works">
			<div class = "line"> <h4 >Простой работ.</h4></div>
			<div class = "line pnl-transfer-header-type" style = "display:none">
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-hold-individual-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Разные причины на разные работы</span></label>
				</div>
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-hold-common-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Общая причина на все работы</span></label>
				</div>
			</div>
			<div class = "line pnl-transfer-header" style = "display:none;">
				<div class = 'line'>
					<span class = "lbl2" style = "margin:3px 10px 0px 0px"><b>Общая причина простоя:</b></span>
					<select class="selectpicker ddl-own-hold-reason" id="own-hold-reson" style = "width:400px;">
						<option>причина простоя</option>
					</select>
				</div>
				<div class = "line reason-note hold-reason-common-note" style = "display:none">
					<span class = "lbl2" style = "margin:3px 47px 0px 0px"><b>Уточнение причины:</b></span>
					<input type = "text" class = "tb-reason-note  tb-hold-reason-common-note"style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
				</div>
				<div class = "line">
					<span class = "lbl2" style = "margin:3px 42px 0px 0px"><b>Общий комментарий:</b></span>
					<textarea class = "tb-note tb-hold-common-note" rows="2" style = "width:500px;"></textarea>
				</div>
			</div>
			<div class = "line data-container hold-data-container" id="pnlHoldDataContainer" style = "display:none"></div>
		</div>
		<!--PAUSE WORKS-->
		<div class = "line pnl-pause-works">
			<div class = "line"> <h4 >Приостановка работ.</h4></div>
			<div class = "line pnl-transfer-header-type" style = "display:none">
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-pause-individual-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Разные причины на разные работы</span></label>
				</div>
				<div class = 'line'>
					<label style = "float:left;"><input type="checkbox" class = "cb cb-pause-common-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Общая причина на все работы</span></label>
				</div>
			</div>
			<div class = "line pnl-transfer-header" style = "display:none;">
				<div class = 'line'>
					<span class = "lbl2" style = "margin:3px 10px 0px 0px"><b>Общая причина приостановки:</b></span>
					<select class="selectpicker ddl-own-pause-reason" id="own-pause-reson" style = "width:400px;">
						<option>причина приостановки</option>
					</select>
				</div>
				<div class = "line reason-note pause-reason-common-note" style = "display:none">
					<span class = "lbl2" style = "margin:3px 95px 0px 0px"><b>Уточнение причины:</b></span>
					<input type = "text" class = "tb-reason-note  tb-pause-reason-common-note"style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
				</div>
				<div class = "line">
					<span class = "lbl2" style = "margin:3px 89px 0px 0px"><b>Общий комментарий:</b></span>
					<textarea class = "tb-note tb-pause-common-note" rows="2" style = "width:500px;"></textarea>
				</div>
			</div>
			<div class = "line data-container pause-data-container" id="pnlPauseDataContainer" style = "display:none"></div>
		</div>
		<div class = 'control-panel'>
			<input type="button" class = "btn btnOk" value = "Сохранить"  />
			<input type="button" class = "btn btnCancel" value = "Отмена"  />
		</div>
	</div>
</div>
