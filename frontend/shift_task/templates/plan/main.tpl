%def scripts():
  <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/controls/techno_map.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/bootstrap-datepicker-1.4.0.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/bootstrap-datepicker.standalone-1.4.0.css?v={{version}}" rel="stylesheet">
  <!---->
  <script src="/static/scripts/libs/babel.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.collapsibleFieldset.js?v={{version}}"></script>

  <!---->
  <link href="/frontend/shift_task/styles/shift_task.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/shift_task/scripts/plan/app.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/models.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/collections.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/routers.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/techno_map_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/control_panel_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/calculate_by_enlarged_product_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/ordered_items_panel_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/can_make_panel_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/main_data_panel_view.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_models.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_collections.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/common_controls/cutting_templates_controls/templates_views.js?v={{version}}"></script>
  <script  type="text/babel" src="/frontend/shift_task/scripts/common_controls/templates_calculator.js?v={{version}}"></script>

  <script>$(function() {
      $.ajaxSetup({timeout:50000});
      bootbox.setDefaults({locale: "ru"});
      $("#shift_task").show();
      // инициализация управления основной формой
      App.initialize({{! weekends }}, {{! orders }});
    });
  </script>
  <style>
    .hide_before::before{display:none!important;}
  </style>
%end
%rebase master_page/base_lastic page_title='Задания на производство', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

%include esud/techno_map_template
%include frontend/shift_task/templates/plan/all_templates
%include frontend/shift_task/templates/common_controls/cut_templates

<!-- ОСНОВНАЯ ФОРМА -->
<div id="shift_task" style = "display:none">
    <div  class="span12 main-control-panel" style = "margin-top:30px; width: 98%;">
      <div class="navbar" id="navigationButtons">
        <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
          <div class="input-prepend input-append" >
            <span class="add-on"><b class="fa fa-cart-plus"></b>&nbsp;Заказ:</span>
            <input type="text" class="tb-order-number"  placeholder="номер заказа" value = ""  style = "display:none" />
            <div class='input-append pnl-ddl-orders' style='margin:0px 0px 3px 0px;'><select class="ddl-orders"  ></select></div>
            <button class="btn btn-success btn-search" id = "btn_search" >Открыть</button>
            <div class="input-prepend input-append" style = "margin:2px 0px 0px 20px;">
                  <label class="checkbox"><input type="checkbox" id="cb-group-by-sectors" checked />группировать по участкам</label>
             </div>
          </div>
        </div>
      </div>
    </div>
    <div id = "shift_task_body" class="data-body" style = "display:none">
      <div class = "maximize">
        <span class = "lnk lnk-collapse" data-val = "min" >развернуть</span>
        <span class = "delimetr">|</span>
        <span class = "lnk lnk-full-screen" data-val = "min">на весь экран</span>
      </div>
      <div class="tabbable">
        <ul class="nav nav-tabs">
            <li class="active"><a href="#tab-new-shift-task" data-toggle="tab" data-number="1">Формирование нового задания</a></li>
            <li ><a href="#tab-products-map" data-toggle="tab" data-number="2">Технологическая карта заказа</a></li>
            <li ><a href="#tab-can-make" data-toggle="tab" data-number="3">Можно изготовить</a></li>
        </ul>
        <div class="tab-content">
            <div class="tab-pane active" id="tab-new-shift-task">
              <div class = "line filter-container" id = "shift_task_filter_container"></div>
              <div class = "line data-container css-treeview" id = "shift_task_data_container"></div>
            </div>
            <div class="tab-pane" id="tab-products-map">
              <div class = "line data-container" id = "techno_map_data_container"></div>
            </div>
            <div class="tab-pane" id="tab-can-make">
              <div class = "line data-container" id = "can_make_data_container"></div>
            </div>
        </div>
      </div>
    </div>
</div>
