%def scripts():
    <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
    <script src="static/scripts/newworkorder/app.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="static/scripts/routine.js?v={{version}}"></script>
    <script>
    $(function(){
        App.initialize({{! planshiftreason_system_objects }});
    });
    </script>
%end

%rebase master_page/base page_title='Задание на производство. Плановые даты работ', current_user=current_user, version=version, scripts=scripts,menu=menu

<style>
    div.alert-info{
        background: #FFF;
    }
    input.datepicker1, input.datepicker2{
        cursor: pointer;
    }
    .table-header{
        margin-bottom: 10px;
        /*color: #494C4E;*/
        color: #000;
    }
    .table-footer{
        margin-top: 30px;
        line-height: 20px;
    }
    .table-h1{
        margin-bottom: 10px;
        margin-top: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ccc;
        font-size: 150%;
        color: #000;
    }
    .table-h2{
        margin-bottom: 5px;
        margin-bottom: 5px;
        color: #000;
    }
    .box-date-finish
    {
        float:left;
    }
    .box-date-finish .tb
    {
        float:left;
        width:70px;
    }
    .box-date-finish i
    {
        float:left;
        margin: 3px 5px 0px 5px;
    }
</style>

<div class = "row hidden-print"  id="find-order-form">
    <div  class="span12">
        <div class="navbar">
            <div  id = "pnlJobLogFilter" class="navbar-inner" style=  "padding-top:10px" >
                <div class="input-prepend input-append">
                    <span class="add-on"><b class="icon-list-alt"></b></span>
                    <input type="text" class="filter-number"  id="order-number"  placeholder="введите номер задания" />
                    <button class="btn btn-primary btn-filter"  id="find-by-order-number" >Открыть</button>
                </div>
                <button type="submit" class="btn btn-print"  style = "display:none"><i class="icon-print"></i></button>
                <button class="btn btn-excel" title="Скачать в формате Excel" style = "float:right; margin:0; display:none;"><i class="icon-download-alt"></i></button>
            </div>
        </div>
    </div>
</div>
<div class="row">
    <div class="span12">
        <hr>
            <div id="product-info" class="row"></div>
            <div id="order-list" class="row">
                <div class="span12">
                    <span>Введите номер задания для ввода плановых дат.</span>
                </div>
            </div>
        <hr>
    </div>
</div>

<script id="ProductInfoTemplate" type="text/template">
<div class="table-h1 span12">
  <div class="row" style = "margin-bottom:20px;">
    <div class="span10">[<%=number%>] <%=name%> </div>
    <div class="span2" style = "text-align:right"><%= (('to_develop' in obj && to_develop)? to_develop['value'] + ' ' + to_develop['unit']:'') %></div>
  </div>
</div>
</script>

<script id="WorkListHeaderTemplate" type="text/template">
<div class="table-header span12">
  <div class="row">
    <div class="span5"><b>№ наряда</b></div>
    <div class="span1"></div>
    <div class="span2"><b>Дата начала работ</b></div>
    <div class="span3"><b>Дата окончания</b></div>
    <div class="span1" title ='Корректировка'><b>Кор.</b></div>
  </div>
</div>
</script>

<script id="WorkListFooterTemplate" type="text/template">
<div class="table-footer span12">
    <div class="row">
        <div class="span6">
        <label><input id="data-is-right" type="checkbox">&nbsp;Введенные данные проверены и верны.</label>
        </div>
        <div class="span6 text-right">
            <button id="cancel-edit" class="btn">Отмена</button>
            <button disabled id="save-data" class="btn">Сохранить</button>
            <button disabled id="replace-data" class="btn">Корректировка</button>
        </div>
    </div>
</div>
</script>
<script id="WorkOrderItemTemplate" type="text/template">
  <div class="table-h2 span12">
    <div class="row">
        <div class="span5"><strong>наряд №: <%= number %><%=(status && status=='completed')?' (завершен)':'' %> </strong></div>
        <div class="span1"></div>
        <div class="span2"></div>
        <div class="span3"></div>
        <div class="span1"><input class="work-check" type="checkbox" <%=((status && status=='completed') || (obj.locked) )?'disabled':'' %>  /><% if(has_access('workorderdate','o')){ %><a class="lock-item"><i class="fa <%= obj.locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
    </div>
  </div>
</script>

<script id="WorkPlanItemTemplate" type="text/template">
    <div class="span12">
    <div class="row">
        <div class="span5 work-name">[<%= number %>] <%= name %></div>
        <div class="span1"><%= (('to_develop' in obj &&to_develop)? to_develop['value'] + ' ' + to_develop['unit']:'') %></div>
        <div class="span2"><input readonly class="span2 datepicker1 datestart" value="<%= date_start_with_shift %>" type="text"></div>
        <div class="span3">
            <div class = "box-date-finish">
                <input type="text" class = "tb tb-days-count"  placeholder="дней" title="Дней на выполнение работы"  style = "width:70px;" value = "<%= ((date_start && date_start!="")?moment(date_finish_with_shift,'DD.MM.YYYY').diff(moment(date_start_with_shift,'DD.MM.YYYY'),'days')+1 : (('days_count' in obj && days_count>0)?days_count:'')) %>"  />
                <i class="fa fa-link"></i>
                <input readonly class="tb datepicker2 datefinish" value="<%= date_finish_with_shift %>" type="text" style = "width:80px;">
            </div>
        </div>
        <div class="span1"><input class="work-plan-check" type="checkbox"><% if(has_access('workorderdate','o')){ %><a class="lock-item"><i class="fa <%= obj.locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
    </div>
    </div>
</script>

<script id="WorkItemTemplate" type="text/template">
<div class="span12 table-h1">
  <div class="row">
    <div class="span5"><%= (('code' in obj && code)?'['+code+'] '+ name:name) %></div>
    <div class="span1"></div>
    <div class="span2"></div>
    <div class="span3"></div>
    <div class="span1"><input class="work-item-check" type="checkbox"><% if(has_access('newworkorder','o')){ %><a class="lock-item"><i class="fa <%= obj.locked?'fa-lock':'fa-unlock' %>"></i></a><% } %></div>
  </div>
</div>
</script>

<script id="TransferTemplate" type="text/template">
<div class="span12">
    <div class="row">
        <div class="span12">
            <strong>Корректировка планов</strong>
            <br>
            <span>Внимание, изменения затронут все отмеченные работы!</span>
        </div>
    </div>
    <div class="row" style = "margin-top:10px;">
        <div class="span12" style = "display:none;">
            Перенести на <input type="text" id="day-num" style="width:40px;" > дней.
        </div>
        <div class="span12">
            <label>Тип корректровки</label>
            <select name="transfer_type" id="transfer-type" style = "width:auto;">
                    <option value="">--Выберите тип корректировки--</option>
                    <option value="start">Перенос без изменения длительности</option>
                    <option value="both">Изменение длительности</option>
            </select>
        </div>
    </div>
    <div class="row row-type-comment-start" style = "display:none;">
        <div class="span12">
            <label style = "color: #999" class = "font12">Укажите новую начальную дату для выбранной группы работ. Дата определяется по дате начала самой ранней работы в группе. Все остальные работы в группе будут перемещены пропорционально, относительно новой начальной даты.</label>
        </div>
    </div>
    <div class="row row-type-date-start" style = "display:none">
        <div class="span12">
            <label>Дата начала:</label>
            <input  class="span2 datepicker1 datestart" value="" type="text" />
        </div>
    </div>
    <div class="row row-type-date-finish" style = "display:none">
        <div class="span12">
            <label>Дата окончания:</label>
            <input  class="span2 datepicker2 datefinish" value="" type="text" />
        </div>
    </div>
    <div class="row">
        <div class="span12">
            <label>Причина переноса<br>
                <select name="transfer_reason" id="transfer-reason" style = "width:auto">
                    <option value="0">--Выберите причину переноса--</option>
                    %for row in plans:
                        <option value="{{str(row['_id'])}}">{{row['name']}}</option>
                    %end
                </select>
            </label>
        </div>
    </div>
    <div class="row row-transfer-reason-detail" style = "display:none;">
        <div class="span12">
            <label>Уточнение причины</label>
            <input id = 'transfer-reason-detail' type = "text" style="width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
        </div>
    </div>
    <div class="row">
        <div class="span12">
            <label>Комментарий<br>
                <textarea name="transfer_comment" id="transfer-comment" class="span12"></textarea>
            </label>
        </div>
    </div>
    <div class="row">
        <div class="span12 text-right">
            <button class="btn close-dialog">Отмена</button>
            <button class="btn transfer-data">Сохранить</button>
        </div>
    </div>
    </div>
</div>
</script>

<div id="transfer-modal" class="modal hide" tabindex="-1" role="dialog" aria-hidden="true" data-backdrop="static" ></div>
