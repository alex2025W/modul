%def scripts():
  <link href="/static/css/stock.css?v={{version}}" rel="stylesheet" media="screen">
  <link rel="stylesheet" href="/static/css/font-awesome.min.css?v={{version}}">
  <link href="/static/css/bootstrap-timepicker.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-timepicker.js?v={{version}}"></script>
  <script src="/static/scripts/stock/app.js?v={{version}}"></script>
  <script>$(function() {App.initialize();});</script>
%end
%rebase master_page/base_lastic page_title='Склад', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--Item-->
<script id="stockItem" type="text/template">
  <td><%=((order)?order['number']:'')%></td>
  <td><%=((production_order)?production_order['number']:'')%></td>
  <td><%=item['number']%></td>
  <td><%=item['name']%></td>
  <td><%=volume_by_plan%></td>
  <td><%=volume_in_develop%></td>
  <td><%=volume_received%></td>
  <td><span class = 'lnk <%=((use_history && use_history.length>0)?"lnk-history":"")%>'><%=volume_in_use%></span></td>
  <td><%=unit%></td>
</script>

<!--history of using-->
<script id="historyItems" type="text/template">
  <td colspan = "9" style = "background-color: #FFFFE0">
    <table class="data-history-list table table-bordered">
      <thead>
        <th style = "width:70%">Дата</th>
        <th style = "width:10%">Заказ</th>
        <th style = "width:10%">Задание</th>
        <th style = "width:10%">Ипользованный объем</th>
      </thead>
      <tbody>
      </tbody>
    </table>
  </td>
</script>
<!--Item-->
<script id="historyItem" type="text/template">
  <td><%=moment.utc(date, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%></td>
  <td><%=((order)?order['number']:'')%></td>
  <td><%=((production_order)?production_order['number']:'')%></td>
  <td><%=value%></td>
</script>

<div id="stock" >
  <div class = "row hidden-print">
    <div  class="span12">
      <div class="navbar">
        <div  id = "pnlStockFilter" class="navbar-inner" style=  "padding-top:10px" >
          <div style="">
            <div class="input-prepend input-append">
              <span class="add-on"><b class="icon-list-alt"></b></span>
              <div class="input-append date date-picker">
                <input id = "tbDate" class ='tbDate' type="text" class="span2"  value = ""  disabled><span class="add-on"><i class="icon-th"></i></span>
              </div>
              <div class="input-append bootstrap-timepicker">
                <input id="tbTime" type="text" class="input-small">
                <span class="add-on"><i class="icon-time"></i></span>
              </div>
            </div>
            <button id= "btnStockFind" class="btn btn-primary btn-filter">Найти</button>
            <button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right;"  ><i class="fa fa-download"></i>&nbsp;Скачать</button>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="pnlStockBody" class="stock-body">
    <!--Data Container-->
    <div class = "line data-container" id="pnlStockDataContainer">
      <table class="data-list table table-striped table-bordered">
        <thead>
          <th style = "width:10%">Заказ</th>
          <th style = "width:10%">Задание</th>
          <th style = "width:10%">Артикул спецификации</th>
          <th style = "width:45%">Название</th>
          <th style = "width:5%">Плановый объем</th>
          <th style = "width:5%">Объем в производстве</th>
          <th style = "width:5%">Оприходованный объем</th>
          <th style = "width:5%">Ипользованный объем</th>
          <th style = "width:5%">Единицы измерения объема</th>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>
