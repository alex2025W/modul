%def scripts():

  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/plannormblank/styles/plannormblank.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/plannormblank/scripts/app.js?v={{version}}"></script>
  <script>
    $(function() {
      bootbox.setDefaults({locale: "ru",});
      App.initialize();
    });
  </script>
%end

%rebase master_page/base page_title='Спецификации заказов. Бланки', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--Group Item-->
<script id="item-head" type="text/template">
  <div class = 'item'>
    <label><input type="checkbox"  class = "cb cbsector-type" value = "<%=type%>" /><span class = "lbl font18"><%=type%></span></label>
  </div>
</script>
<!--Item-->
<script id="item" type="text/template">
  <label ><input  type="checkbox" class = "cb cb-sector" value = "<%=_id%>" <%=(checked)?'checked':''%> <%=(!haveItemsWithoutBlank)?'disabled':''%> /><span class = "lbl"><%=name + ' [' +code.toString()+ ']'%></span></label>
</script>

<div id="planNormBlank" >
  <div class = "row hidden-print">
    <div  class="span12">
      <div class="navbar">
        <div  id = "pnlPlanNormBlankFilter" class="navbar-inner" style=  "padding-top:10px" >
          <div class="input-prepend input-append">
            <span class="add-on"><b class="icon-list-alt"></b></span>
            <input type="text" class="filter-number" id = "tbOrderNumber"  placeholder="введите номер заказа" />
            <button id= "btnPlanNormBlankFind" class="btn btn-primary btn-filter">Открыть</button>
          </div>
          <button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; display:none"  ><i class="icon-download-alt"></i></button>
        </div>
      </div>
    </div>
  </div>
  <div id="pnlPlanNormBlankBody" class="plan-norm-blank-body">
    <div class="lbl-header"></div>
    <!--Data Container-->
    <div class = "line data-container" id="pnlPlanNormBlankContainer"></div>
    <!--Options-->
    <div class = "line data-options" id="pnlPlanNormBlankoptions" style = "display:none">
      <div class = 'line'>
        <label style = "float:left;"><input type="checkbox" class = "cb cb-split-sectors" checked style = "margin:3px 0px 0px 0px;" /><span  style = "float:left; padding-left:5px">Отдельный бланк для каждого участка</span></label>
      </div>
      <div class = 'line'>
        <label style = "float:left;"><input type="checkbox" class = "cb cb-no-old-blanks" checked style = "margin:3px 0px 0px 0px;" /><span  style = "float:left; padding-left:5px">Учитывать ранее выданные бланки</span></label>
      </div>
      <div class = 'line'>
        <label style = "float:left;"><input type="checkbox" class = "cb cb-send-notify" checked style = "margin:3px 0px 0px 0px;" /><span  style = "float:left; padding-left:5px">Уведомить получателей</span></label>
      </div>
    </div>
    <!-- Control Panel-->
    <div class = 'control-panel' style = "display:none">
      <input type="button" class = "btn btnOk" value = "Сгенерировать"  />
      <input type="button" class = "btn btnCancel" value = "Отмена"  />
    </div>
  </div>
</div>
