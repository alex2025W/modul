%def scripts():
  <link href="/static/css/selectize.bootstrap2.css?v={{version}}" rel="stylesheet">
  <!---->
  <script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment-range.min.js?v={{version}}"></script>
  <!--<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>-->
  <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
  <script src="/frontend/libs/jquery.datatables/jquery.datatables.min.js?v={{version}}"></script>
  <script src="/frontend/libs/bootstrap.multiselect.v2/index.js?v={{version}}"></script>
  <link href="/frontend/libs/bootstrap.multiselect.v2/index.css?v={{version}}" rel="stylesheet">
  <!---->
  <link href="/frontend/joblog_statistic/styles/index.css?v={{version}}" rel="stylesheet">
  <script src="/frontend/joblog_statistic/scripts/app.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/models.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/collections.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/find_view.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/main_view.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/data_table_view.js?v={{version}}"></script>
  <script src="/frontend/joblog_statistic/scripts/chart_view.js?v={{version}}"></script>

  <!-- google charts -->
  <script type="text/javascript" src="https://www.gstatic.com/charts/loader.js"></script>
  <!---->
  <script>
    window['moment-range'].extendMoment(moment);
    $(function() {
      // google charts
      google.charts.load('current', {packages: ['corechart', 'line']});
      google.charts.setOnLoadCallback(App.googleChartsLibraryLoadingComplete);
      // bootbox
      bootbox.setDefaults({locale: "ru",});
      // app init
      App.initialize(
        {{! user_filters_info }}
      );
    });
  </script>
%end

%rebase master_page/base_lastic  page_title='Журнал работ. Статистика', current_user=current_user, version=version,  scripts=scripts,  menu=menu



<!--TABLE DATA ITEM TEMPLATE-->
<script id="DataTableItemTemplate" type="text/template">
  <td><%=i%></td>
  <td><%=user_fio%></td>
  <td><%=moment(wp_fact_date).format('DD.MM.YYYY')%></td>
  <td><%=contract_number%></td>
  <td><%=order%></td>
  <td><%=sector_type%></td>
  <td><%=sector_code%></td>
  <td><%=sector_name%></td>
  <td><%=user_email?user_email.split('@')[0].replace('1_',''):''%></td>
  <td><%=Routine.addCommas(proportion.toFixed(2).toString()," ")%></td>
  <td><%=number%></td>
</script>

<script id="DataTableTemplate" type="text/template">
  <table class = 'in-info'>
    <thead>
      <tr>
        <th class="column-data th-index no-sort" style = "width:2%"></th>
        <th class="column-data" id="thFio" style = "width:15%"><span  class="lbl">ФИО</span></th>
        <th class="column-data" style = "width:7%"><span class="lbl">Дата</span></th>
        <th class="column-data" style = "width:5%"><span class="lbl">Договор</span></th>
        <th class="column-data" style = "width:5%"><span class="lbl">Заказ</span></th>
        <th class="column-data" style = "width:16%"><span class="lbl">Направление</span></th>
        <th class="column-data" style = "width:5%"><span class="lbl">Код участка</span></th>
        <th class="column-data" style = "width:20%"><span class="lbl">Участок</span></th>
        <th class="column-data" style = "width:10%"><span class="lbl">Таб. номер</span></th>
        <th class="column-data" style = "width:5%"><span class="lbl">участие (%)</span></th>
        <th class="column-data" style = "width:5%"><span class="lbl">Наряд</span></th>
      </tr>
    </thead>
    <tfoot style="display: none;">
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
      <th></th>
    </tfoot>
    <tbody class = "data-list"></tbody>
  </table>
</script>





<div id="joblog" >
  <!-- Панель фильтрации и поиска -->
  <div class = "row hidden-print" style = "margin: 0px 5px 0px -15px;">
    <div  class="span12" style = "margin-top:30px; width: 100%;">
      <div class="navbar">
        <div id = "pnlJobLogFilter" class="navbar-inner" style="padding-top:10px; " >
          <div>
            <div class="input-prepend " style = "width:100%">
              <!--date filter-->
              <div class="input-append date date-picker" title="Отчетная дата">
                <div class="add-on">
                  <label
                    class="checkbox"
                    style="font-size: 12px;"
                    title="Оставьте не выбранным, если фильтр по датам не требуется">
                    <input type="checkbox" id="cbPeriod" />Период:
                  </label>
                </div>
                <input
                  class ='tbDateFrom'
                  type="text"
                  style="width:80px;
                  cursor: pointer"
                />
                <input
                  class ='tbDateTo'
                  type="text"
                  style="width:80px;
                  cursor: pointer"
                />
              </div>
              <!-- Orders -->
              <div class='input-append pnl-ddl-orders' >
                <select class="ddl-orders" multiple="multiple" style = "display: none">
                  %for number in order_numbers:
                    <option value="{{ number }}">{{ number }}</option>
                  %end
                </select>
              </div>
              <!--Sectors filter-->
              <select class="ddl-sectors" multiple="multiple" style = "display:none">
                %for sector_type in sectors:
                <optgroup label="{{sector_type['info']['name']}}">
                  %for sector in sector_type['items']:
                  <option value="{{str(sector['code'])}}">[{{sector['code']}}] {{sector['name']}}</option>
                  %end
                </optgroup>
                %end
              </select>

              <!--User settings -->
              <div class="input-append" style = "display: none">
                <div class="add-on">
                  <label
                    class="checkbox"
                    style="font-size: 11px;"
                    title="Запомнить настройки фильтров при следующем входе.">
                    <input type="checkbox" id="cbSaveFilters" />Сохранить настройки фильтров
                  </label>
                </div>
              </div>
              <div class='input-append input-prepend'>
                <button id= "btnDataFind" class="btn btn-primary btn-search">Показать</button>
              </div>
              <div class="input-append" style="margin-left:10px;">
                <div class="btn-group">
                  <button class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
                    Выгрузить
                    <span class="caret"></span>
                  </button>
                  <ul class="dropdown-menu">
                     <li><a href="#" class="btn-google">Гугл-таблица</a></li>
                     <li><a href="#" class="btn-excel">Эксель</a></li>
                  </ul>
                </div>
              </div>
              <!--
              <div class='input-append' style = "float:right;">
                <button
                  class="btn btn-excel"
                  title="Скачать в формате Excel">
                    <i class="fa fa-file-excel-o"></i>
                </button>
                <button
                  class="btn btn-google"
                  title="Открыть в таблицах GOOGLE">
                    <i class="fa fa-google"></i>
                </button>
              </div>
            -->
            </div>
          </div>
          <div style = "margin: 10px 0px">
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- MAIN DATA CONTAINER-->
  <div class="row" id = "main-data-container">
    <div class="span12" style = "width:100%;box-sizing: border-box; padding: 10px;">
      <!--TABS-->
      <ul class="nav nav-tabs">
        <li class="active">
          <a href="#data-charts" data-toggle="tab" data-type="data-charts">Графики</a>
        </li>
        <li>
          <a href="#data-table" data-toggle="tab" data-type="data-table">Таблица</a>
        </li>
      </ul>
      <!--TAB TABLE VIEW-->
      <div id="data-table" class = "data-table dataTables_wrapper" style="display: none;">
        <!--Блок отображения табличного вида-->
        <div class="data-list-body" id = "pnlTableDataContainer">
          <div class = "line data-container">
             <table class = 'in-info'>
              <thead>
                <tr>
                  <th class="column-data th-index no-sort" style = "width:2%"></th>
                  <th class="column-data" id="thFio" style = "width:15%"><span  class="lbl">ФИО</span></th>
                  <th class="column-data" style = "width:7%"><span class="lbl">Дата</span></th>
                  <th class="column-data" style = "width:5%"><span class="lbl">Договор</span></th>
                  <th class="column-data" style = "width:5%"><span class="lbl">Заказ</span></th>
                  <th class="column-data" style = "width:16%"><span class="lbl">Направление</span></th>
                  <th class="column-data" style = "width:5%"><span class="lbl">Код участка</span></th>
                  <th class="column-data" style = "width:20%"><span class="lbl">Участок</span></th>
                  <th class="column-data" style = "width:10%"><span class="lbl">Таб. номер</span></th>
                  <th class="column-data" style = "width:5%"><span class="lbl">участие (%)</span></th>
                  <th class="column-data" style = "width:5%"><span class="lbl">Наряд</span></th>
                </tr>
              </thead>
              <tfoot style="display: none;">
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
              </tfoot>
              <tbody class = "data-list"></tbody>
            </table>
          </div>
        </div>
      </div>
      <!--TAB CHARTS VIEW-->
      <div id="data-charts">
        <div class="line pnl-charts-container" id="pnlChartsContainer" >
        </div>
      </div>
      <!---->
    </div>
  </div>
  <!--END OF MAIN DATA CONTAINER-->
</div>
