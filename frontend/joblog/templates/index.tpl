%def scripts():
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen, print">
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

  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-slider.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/joblog/styles/joblog.css?v={{version}}" rel="stylesheet">
  <link href="/frontend/joblog/styles/plans.css?v={{version}}" rel="stylesheet">
  <link href="/frontend/joblog/styles/ktu_statistic.css?v={{version}}" rel="stylesheet">
  <link href="/frontend/joblog/styles/history_facts.css?v={{version}}" rel="stylesheet">

  <script src="/frontend/joblog/scripts/app.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/main_view.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/models.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/collections.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/ktu_statistic_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/plans.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/transfer_fact_dlg.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/materials_items_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/data_transfer_view.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/work_order_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/workers_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/history_facts_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/reports_settings_view.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/control_panel_view.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/work_order_list_views.js?v={{version}}"></script>
  <script src="/frontend/joblog/scripts/view_pager.js?v={{version}}"></script>
  <!---->
  <script>
    window['moment-range'].extendMoment(moment);
    $(function() {
      bootbox.setDefaults({locale: "ru",});
      App.initialize(
        {{! sectors }},
        {{! teams }},
        {{! planshiftreason_system_objects }},
        {{! all_workers }},
        {{! weekends }},
        {{! user_filters_info }},
        {{! time_sheet_reasons }}
      );
    });
  </script>
%end

%rebase master_page/base page_title='Журнал работ', current_user=current_user, version=version, scripts=scripts,menu=menu, time_sheet_reasons = time_sheet_reasons
%include frontend/joblog/templates/all_templates
%include frontend/joblog/templates/ktu_statistic
%include frontend/joblog/templates/plans

<div id="joblog" >
  <!-- Панель фильтрации и поиска -->
  <div class = "row hidden-print">
    <div  class="span12" style = "width:100%;">
      <div class="navbar">
        <div id = "pnlJobLogFilter" class="navbar-inner" style="padding-top:10px; width:960px;" >
          <!--Upper filter block-->
          <div>
            <div class="input-prepend input-append">
              <span class="add-on"><b class="icon-list-alt"></b></span>
              <input type="text" class="filter-number" id = "tbWorkOrderNumber" style = "width:100px;" placeholder="номер наряда" />
              <button id= "btnJobLogFind" class="btn btn-primary btn-filter">Открыть</button>
            </div>
            <button
              type="button"
              id="btnDownloadQStat"
              class="btn btn-download-qstat"
              style = "float:right; display: none;">
              &nbsp;Скачать
            </button>
            <div class="input-prepend input-append" style="float: right; display: none">
              <span class="add-on"><i class="fa fa-download"></i></span>
              <input
                type="text"
                class="search-order-number"
                id="tbOrderNumber"
                style="width:100px;" placeholder="номер заказа"
              />

            </div>
          </div>
          <!-- Down filter block -->
          <div style = "margin: 10px 0px;">
            <!--date filter-->
            <div class="input-prepend input-append" style = "width:100%">
              <span class="add-on" title="Отчетная дата"><b class="icon-list-alt"></b> Отчетная дата: </span>
              <div class="input-append date date-picker" title="Отчетная дата">
                <input class ='tbDate' type="text" readonly="readonly" style="width:80px; cursor: pointer" />
                <button type="button" class="btn" >
                  <i class="icon-th"></i>
                </button>
              </div>
            </div>
          </div>
          <div style = "margin: 10px 0px">
            <!--order filter-->
            <div class='input-append pnl-ddl-orders' >
              <select class="ddl-orders" multiple="multiple" style = "display: none">
                %for number in order_numbers:
                  <option value="{{ number }}">{{ number }}</option>
                %end
              </select>
            </div>
            <!--sector type filter-->
            <div class='input-append pnl-ddl-sector-types'>
              <select class="ddl-sector-types" multiple="multiple" style = "display:none">
                %for row in sector_types:
                  <option value="{{ row['type'] }}">{{ row['type'] }}</option>
                %end
              </select>
            </div>
            <!--Sectors filter-->
            <div class='input-append pnl-ddl-sectors'>
              <select class="ddl-sectors" multiple="multiple" style = "display:none"></select>
            </div>
            <!--Facts filter-->
            <div class='input-append pnl-ddl-fact-status'>
              <select class="ddl-fact-status" style = "display:none">
                <option value="">Все</option>
                <option value="no_data">Нет данных</option>
                <option value="on_work">Факт</option>
                <option value="on_hold">Простой</option>
              </select>
            </div>
            <div class="input-append">
              <div class="add-on">
                <label class="checkbox" style="font-size: 11px;" title="Запомнить настройки фильтров при следующем входе.">
                  <input type="checkbox" id="cbSaveFilters" />Сохранить настройки фильтров
                </label>
              </div>
            </div>
            <div class='input-append'>
              <button id= "btnDataFind" class="btn btn-primary btn-search">Показать</button>
              <button
                title="Скачать выбранные заказы"
                type="button"
                id="btnDownloadStat"
                class="btn btn-download-stat"
                style="float:right; margin-left: 5px;">
                <i class="fa fa-download"></i>&nbsp;Скачать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ОСНОВНОЙ БЛОК ДАННЫХ-->
  <div class="row" style = "margin-left:0px;">
    <div class="span12" style = "width:100%;">
      <ul class="nav nav-tabs">
        <li class="active" style="display:none">
          <a href="#main-data" data-toggle="tab" data-type="main_data">Ввод</a>
        </li>
        <li style="display:none">
          <a href="#data-plans" data-toggle="tab" data-type="data_plans">Планы</a>
        </li>
        <li style="display:none">
          <a href="#data-ktu-statistic" data-toggle="tab" data-type="data_ktu_statistic">Вывод</a>
        </li>
      </ul>

      <!--TAB INPUT DATA-->
      <div id="main-data" class = "main-data" style="display: none;">
        <!--Блок списка нарядов-->
        <div id = "work_order_list_body" class="data-list-body" style = "display: none">
          <div class = "line data-container" >
             <table class = 'in-info'>
              <thead>
                <!--Наряд, Участок, Заказ, Отчёт (да / нет)-->
                <tr>
                  <td style = "width:10%">Наряд</td>
                  <td style = "width:30%">Участок</td>
                  <td style = "width:20%">Направление</td>
                  <td style = "width:30%">Заказ</td>
                  <td style = "width:10%">Статус</td>
                </tr>
              </thead>
              <tbody class = "data-list"></tbody>
            </table>
          </div>
          <div class = "line list-pager" id = "list-pager"></div>
        </div>

        <!--Блок детализации наряда-->
        <div id="pnlJobLogBody" class="joblog-body" style = "display:none">
          <div class="lbl-header">
            <div class = "lbl"></div>
            <div class = 'crl'>
              <select class = "ddl ddl-common-status" style = "display: none">
                <option value = "">Общий статус</option>
                <option value = "on_work">В работе</option>
                <option value = "on_pause">Приостановлена</option>
                <option value = "on_hold" >Простой</option>
              </select>
              <label style = "float:left; margin-top: 10px; margin-right:4px;">
                <input type="checkbox" class = "cb cb-extra-functions" /><span  style = "float:left;">&nbsp;Доп. функции</span>
              </label>
            </div>
          </div>
          <div class = "data-header-container">
            <div class = "data-header">
              <div class = "item" style = "width:6%">Код</div>
              <div class = "item" style = "width:34%">Наименование</div>
              <div class = "item" style = "width:8%;">Ед.</div>
              <div class = "item" style = "width:10%;">План</div>
              <div class = "item" style = "width:10%;">Остаток</div>
              <div class = "item" style = "width:15%">Факт</div>
              <div class = "item pnl-extra-functions" style = "width:12%; display: none">&nbsp;</div>
            </div>
          </div>
          <div class = "line data-container" id="pnlJobLogDataContainer"></div>
          <div class = "line" style = "margin-top:10px;">
            <label style = "float:left; display: none;">
              <input type="checkbox" class = "cb cb-weekend" style = "margin:3px 0px 0px 6px; " /><span  style = "float:left; margin-left:3px;">Внерабочее время</span>
            </label>
            <label style = "float: left; margin-left: 19px;">
              <input type="checkbox" class = "cb cb-works-done-with-reject" style = "margin:3px 6px 0px 6px;" /><span  style = "float:left; margin-left:3px;">Работы выполнялись с отклонениями</span>
            </label>
          </div>
          <!-- Изделия-->
          <div class = "lbl-header1 lbl-materials-header" style = "margin-top:20px; display:none;">Изделия</div>
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
            <input type="button" class = "btn btn-primary btnOk" value = "Сохранить"  />
            <input style = "display:none" type="button" class = "btn btn-warning btnCancel" value = "Отмена"  />
          </div>

          <!-- Трудовое участия, форма истории-->
          <div class="line pnl-workers-history-container" id="pnlWorkersHistoryContainer" >
            <div class="lbl-header1 lbl-workers-history-header" style="margin-top:30px;">
              <span style="float:left;">Трудовое участие (история)</span>
            </div>
            <div class = "data-header-container" style = "margin-top:20px;">
              <div class = "data-header">
                <div class = "item" style = "width:85%">ФИО рабочего</div>
                <div class = "item" style = "width:15%">&nbsp;Участие</div>
              </div>
            </div>
            <div class="line data-container data-workers-history-container" style="margin-top:10px;" id="pnlWorkersHistoryDataContainer">
            </div>
          </div>
        </div>

        <!--Блок переноса дат-->
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
          <!--REJECTS WORKS-->
          <div class = "line pnl-reject-works">
            <div class = "line"> <h4 >Работы с отклонениями.</h4></div>
            <div class = "line pnl-transfer-header-type" style = "display:none">
              <div class = 'line'>
                <label style = "float:left;">
                  <input type="checkbox" class="cb cb-reject-individual-reason" style="margin:3px 0px 0px 6px;"/>
                  <span  style = "float:left; padding-left:5px">Разные причины на разные работы</span>
                </label>
              </div>
              <div class = 'line'>
                <label style = "float:left;">
                  <input type="checkbox" class = "cb cb-reject-common-reason" style = "margin:3px 0px 0px 6px;" /><span  style = "float:left; padding-left:5px">Общая причина на все работы</span>
                </label>
              </div>
            </div>
            <div class = "line pnl-transfer-header" style = "display:none;">
              <div class = 'line'>
                <span class = "lbl2" style = "margin:3px 10px 0px 0px"><b>Общая причина отклонения:</b></span>
                <select class="selectpicker ddl-own-reject-reason" id="own-reject-reson" style = "width:400px;">
                  <option>причина отклонения</option>
                </select>
              </div>
              <div class = "line reason-note reject-reason-common-note" style = "display:none">
                <span class = "lbl2" style = "margin:3px 47px 0px 0px"><b>Уточнение причины:</b></span>
                <input type = "text" class = "tb-reason-note  tb-reject-reason-common-note"style = "width:500px;" placeholder="номер наряда/код работы, номер наряда/код работы"></input>
              </div>
              <div class = "line">
                <span class = "lbl2" style = "margin:3px 42px 0px 0px"><b>Общий комментарий:</b></span>
                <textarea class = "tb-note tb-reject-common-note" rows="2" style = "width:500px;"></textarea>
              </div>
            </div>
            <div class = "line data-container reject-data-container" id="pnlRejectDataContainer" style = "display:none"></div>
          </div>
          <!---->
          <div class = 'control-panel'>
            <input type="button" class = "btn btnOk" value = "Сохранить"  />
            <input type="button" class = "btn btnCancel" value = "Отмена"  />
          </div>
        </div>
      </div>
      <!--TAB KTU STATS-->
      <div id="data-ktu-statistic" style="display: none;"></div>
      <!--TAB INPUT DATA-->
      <div id="data-plans" style="display: none;">
        <!-- Календарь планов-->
        <div class="line pnl-plans-container" id="pnlPlansContainer"></div>
        <!-- История ввода фактов-->
        <div class="line pnl-facts-history-container" id="pnlFactsHistoryContainer" >
          <div class="lbl-header1 lbl-facts-history-header" style="margin-top:30px;">
            <span style="float:left;">История ввода фактов</span>
          </div>
          <table class = 'in-info'>
              <thead>
                  <tr style = "background-color: whitesmoke;">
                      <td style="width:10%">Дата факта</td>
                      <td style="width:5%">Код</td>
                      <td style="width:30%">Название</td>
                      <td style="width:5%">Ед.</td>
                      <td style="width:6%">План</td>
                      <td style="width:8%">Остаток</td>
                      <td style="width:9%">Факт</td>
                      <td style="width:9%">Статус</td>
                      <td style="width:9%">Дата ввода</td>
                      <td style="width:9%">Менеджер</td>
                  </tr>
              </thead>
              <tbody class = "facts-data-list">
              </tbody>
          </table>
        </div>
      </div>
      <!---->
    </div>
  </div>
  <!---->
</div>
