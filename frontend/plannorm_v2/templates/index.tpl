%def scripts():
<link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
<link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
<link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
<link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
<link href="/static/css/bootstrap-datepicker-1.4.0.css?v={{version}}" rel="stylesheet">
<link href="/static/css/bootstrap-datepicker.standalone-1.4.0.css?v={{version}}" rel="stylesheet">
<link href="/static/css/jquery.textcomplete.css?v={{version}}" rel="stylesheet" media="screen, print">



<script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
<script src="/static/scripts/routine.js?v={{version}}"></script>
<script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.dataTables-1.10.0.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
<script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
<script src="/frontend/libs/jquery.numeric.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
<script src="/static/scripts/select2.js?v={{version}}"></script>
<script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>

<!---->
<link href="/frontend/plannorm_v2/styles/plannorm.css?v={{version}}" rel="stylesheet" media="screen">
<script src="frontend/plannorm_v2/scripts/router.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/app.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/models.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/collections.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_filter_box.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/main_view.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_controlpanel.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_orderinfo.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_pager.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_search_line.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/groups_calculation_view.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/templates_data_list_view.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/materials_data_list_view.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/specification_materials_data_list_view.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_new_specification_panel.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_link_specification_panel.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_import_category_dialog.js?v={{version}}"></script>
<script src="frontend/plannorm_v2/scripts/view_bulk_data_insert_dialog.js?v={{version}}"></script>
<!--Conformity-->
<script src="/frontend/conformity/scripts/edit_material_view.js?v={{version}}"></script>
<script src="/frontend/conformity/scripts/models.js?v={{version}}"></script>
<script src="/frontend/conformity/scripts/collections.js?v={{version}}"></script>
<link href="/frontend/conformity/styles/edit_material.css?v={{version}}" rel="stylesheet" media="screen">
<script src="/frontend/conformity/scripts/linked_materials_views.js?v={{version}}"></script>
<script src="/frontend/conformity/scripts/unique_props_views.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.textcomplete.js?v={{version}}"></script>
<!--Multi Page Access-->
<script src="/frontend/widgets/multi_page_access/scripts/app.js?v={{version}}"></script>
<link href="/frontend/widgets/multi_page_access/styles/index.css?v={{version}}" rel="stylesheet" media="screen">

<script>
  $(function () {
    $.ajaxSetup({ timeout: 50000 });
    bootbox.setDefaults({ locale: "ru" });
    App.initialize({{! sector }}, {{! search_numbers }}, {{! templates }});
    $("#plannorm").show();
  });
</script>
%end

%rebase master_page/base_lastic page_title='Спецификации заказов 2.0', current_user=current_user, version=version, scripts=scripts, menu=menu

%include frontend/plannorm_v2/templates/materials
%include frontend/plannorm_v2/templates/pager
%include frontend/plannorm_v2/templates/search_line_view
%include frontend/plannorm_v2/templates/groups_calculation
%include frontend/plannorm_v2/templates/specification_materials
%include frontend/plannorm_v2/templates/specification_templates
%include frontend/plannorm_v2/templates/filter_box_view
%include frontend/plannorm_v2/templates/view_import_category_dialog
%include frontend/plannorm_v2/templates/view_bulk_data_insert_dialog
%include frontend/conformity/templates/edit_material_template
%include frontend/widgets/multi_page_access/templates/index

<!-- Order information -->
<script id="OrderInformationTemplate" type="text/template">
  <%if(number){%>
    <span class = "lbl">
      <%=document_type=='contract'?'Заказ':'Заявка'%>: [<%=number%>.<%=product.number%>] <%=product.name%>
    </span><br>
  <%}else{%>
    <span class = "lbl">
      Шаблон спецификации
    </span><br>
  <%}%>
  <span class = "lbl-light">
    <%=specification_number?'Спецификация: <span class="bcolor-yellow bold color-black">' + specification_number+'</span>': 'Создание новой спецификации' %>
  </span>
</script>

<!-- Шаблон оповещения о том, что ничего не найдено -->
<script id="DataNotFoundTemplate" type="text/template">
  <div class="span12"><span>Нет данных.</span></div>
</script>

<!-- Шаблон оповещения о необходимости заполнения критериев поиска данных -->
<script id="SetSearchQueryTemplate" type="text/template">
  <div class="span11"><span>Задайте критерии поиска.</span></div>
</script>

<div id="plannorm" style="display:none">
  <div class="plannorm-wrapper wrap">
    <!--LEFT SIDE-->
    <div class="left-side">
      <div class="navbar" id="navigationButtons">
        %include frontend/plannorm_v2/templates/control_panel_view
      </div>
    </div>
    <!-- RIGHT SIDE-->
    <div class="right-side">
      <!-- Templates List -->
      <div id="pnlTemplatesList" class='templates-list' style="display: none">
        <div class="line">
          <span class="lbl font18">Шаблоны для расчета</span>
          <button style="float: right" id="add-new-template" class="btn btn-add-new-template btn-primary">Новый шаблон
          </button>
        </div>
        <table class="in-info main-data" style="margin-top:20px;">
          <thead>
            <tr>
              <th style="width:90%">
                <span>Примечание к шаблону</span>
              </th>
              <th style="width:10%">
                <span>Номер спецификации</span>
              </th>
            </tr>
          </thead>
          <tbody class="data-body"></tbody>
        </table>
      </div>
      <!-- MAIN DATA -->
      <div id="pnlMainDataBox" class='document-detail' style="display:none">
        <!--Информация о мультипользователях-->
        <div id="pnlMultiPageAccess" class="pnl-multi-page-access-container"></div>
        <!--Информация о спецификации-->
        <div id="pnlOrderInfo" class="pnl-order-info"></div>
        <span class="lnk lnk-maximize" data-val="min" style="float: right; margin: 5px">развернуть</span>
        <div class="tab-pane main-data-container" id="main-data-container">
          <ul class="nav nav-tabs main-data-tabs" style="margin-top:10px;">
            <li class="active">
              <a data-type="data-groups-calculations" href="#data-groups-calculations" data-toggle="tab">Оценка
              </a>
            </li>
            <li>
              <a data-type="data-materials" href="#data-materials" data-toggle="tab">Материалы
              </a>
            </li>
            <li>
              <a data-type="data-calculations" href="#data-calculations" data-toggle="tab">Расчет
              </a>
            </li>
          </ul>
          <div class="tabbable">
            <div class="tab-content">
              <div class="tab-pane active tab-box" id="data-materials">
                <div id="materials-data-body-container" class="dataTables_wrapper"></div>
              </div>
              <div class="tab-pane tab-box" id="data-calculations">
                <div id="specification_list_to_calcualte_body" class="data-list-to-calculate-body">
                  <div id="specification-materials-data-body-container" class="dataTables_wrapper" style="padding-bottom:150px;">
                  </div>
                </div>
              </div>
              <div class="tab-pane tab-box" id="data-groups-calculations" style="overflow-y:  hidden;">
                <div id="groups-calculation-data-body-container" class="dataTables_wrapper"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="table-footer span12 pnl-save-controls" style="width:100%;">
          <div class="row">
            <button id="save-data" class="btn btn-save-all-and-close btn-primary">Сохранить и закрыть</button>
            <button id="save-data" class="btn btn-save-all btn-primary">Сохранить</button>
            <input style="float:right; margin-right:20px; width: 50%" type="text" class="note specification-note" value="" />
            <span class="lbl" style="float: right; margin: 6px 10px 0px 10px;">Примечание:</span>
          </div>
        </div>

      </div>
    </div>
    <!--end right side-->
  </div>
</div>