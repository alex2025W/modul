<div id="controlPanel" class="navbar-inner control-panel">
  <div class="line">
    <!--Search documant box-->
    <div style="float:left; width: 100%;" class="pnl-search-object">
      <span class="lbl-order-number">Открыть:</span>
      <input type="text" class="tb-order-number" />
      
      <button 
        style="float: right; margin-top: 5px; display: none"
        title="Импорт / Экспорт расчетов" 
        class="btn btn-primary btn-import-data">
        <i class="fa fa-download"></i>          
      </button>

      <div class="lnk-download-to-google" style="float: right; display: none;">
        <div class="btn-group">
          <button title="Выгрузить данные в гугл таблицу" class="btn btn-primary dropdown-toggle" data-toggle="dropdown">
            <i class="fa fa-table"></i>
            <span class="caret"></span>
          </button>
          <ul class="dropdown-menu ul-download-to-google"></ul>
        </div>
      </div>
    </div>
    <div class="color-lightgrey font11 italic lbl-help" style="padding-top:5px; display: inline-block;">
      Введите номер заявки, заказа или шаблона расчета
    </div>

    <!--Link specification-->
    <div class="pnl-link-specification" id="pnl-link-specification" style="display: none">
      <div class="color-lightgrey font11 italic lbl-help" style="padding-top:5px; display: inline-block;">
        Вы можете загрузить расчеты из существующего документа.
        <br> Также вы можете копировать текущие расчеты в другие документы. Все данные по старым расчетам будут перезаписаны.
      </div>
      <div class="line" style="margin-top:20px;">
        <select class="ddl ddl-import-export">
          <option value="">Импорт / Экспорт</option>
          <option value="import">Импортировать в расчет</option>
          <option value="export">Экспортировать расчет</option>
        </select>
      </div>
      <div style="float:left; display: none;" class="pnl-search-object">
        <span class="lbl-order-number">Открыть:</span>
        <input type="text" class="tb-search-object" style="width: 100px;" />
        <div class="color-lightgrey font11 italic lbl-help" style="padding-top:5px; display: inline-block;">
          Введите номер заявки, заказа или шаблона расчета
        </div>
      </div>
      <div class="line pnl-link-specification-buttons" style='margin:15px 0px 3px -10px; float: left; display: none;'>
        <button class="btn btn-success btn-add">Выполнить
        </button>
      </div>
    </div>

    <!--Enable structure groups-->
    <div class='line pnl-group-by' style="display: none">
      <span style="padding-bottom:5px;" class="group-header">Группировать по:</span><br>
      <label class="checkbox">
          <input type="checkbox" checked value="sector_id" class="cb-group-by">
          <span>Направлению</span>
        </label>
      <label class="checkbox">
        <input type="checkbox" checked value="category_id" class="cb-group-by">
        <span>Категории</span>
      </label>
      <label class="checkbox">
        <input type="checkbox" checked value="group_id" class="cb-group-by">
        <span>Группе</span>
      </label>
    </div>

    <!-- Filter panel by categories and groups-->
    <div id="pnlFilterBox" class="pnl-search simple-view" style="display:none">
      <span class="font14 color-lightgrey lbl-note">
        Задайте критерии поиска материалов.
      </span>
      <br/>
      <!-- main block-->
      <div id="pnlFiltersGroupsBox" class='line pnl-filters-groups' style='margin:15px 0px 3px 0px;'>
      </div>
      <!--Buttons-->
      <div class="line filters-control-panel" style='margin:15px 0px 3px 0px; text-align: right;'>
        <a style="margin-right: 10px" class="lnk btn-clear-filters" id="btn_clear_filters">Очистить
        </a>
        <a class="lnk btn-filter-data" id="btn_filter_data">Применить
        </a>
      </div>
    </div>
    <!---->
  </div>
</div>