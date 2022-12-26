%def scripts():
    <!-- STYLES-->
    <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
    <link href="/static/css/conformity/conformity.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/conformity/search_material.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/conformity/edit_material.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/bootstrap-datepicker-1.4.0.css?v={{version}}" rel="stylesheet">
    <link href="/static/css/bootstrap-datepicker.standalone-1.4.0.css?v={{version}}" rel="stylesheet">
    <!-- SCRIPTS-->
    <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
    <script src="/static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
    <script src="/static/scripts/conformity/app.js?v={{version}}"></script>
    <script src="/static/scripts/conformity/edit_material_form_container_view.js?v={{version}}"></script>
    <script src="/static/scripts/conformity/search_material_view.js?v={{version}}"></script>
    <script src="/static/scripts/conformity/edit_material_view.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
    <script src="/static/scripts/select2.js?v={{version}}"></script>
    <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
    <script>
        $(function() {
            bootbox.setDefaults({locale: "ru"});
            $("#conformity").show();
            App.initialize({{! data }});
        });
    </script>
%end
%rebase master_page/base_lastic  page_title='Соответствие. Работы/Материалы', current_user=current_user, version=version, scripts=scripts,menu=menu
%include conformity/search_material_template
%include conformity/edit_material_template

<!--WORKS DATA TEMPLATE -->
<script id="dataTemplateWorks" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
    <%}
    else{
        var cur_sector_type = obj[0]['sector_type'];
        var cur_sector_id = obj[0]['sector_id'];%>
        <div class = 'css-treeview'>
            <ul>
                <% var i = 0;
                for (var row_index = 0; row_index<obj.length; row_index++, i++){
                var row =obj[row_index];%>
                <li class = 'h1'>
                    <label class = 'lbl-plus' for="item-0-<%=i%>">&nbsp;</label>
                    <input class = "li" type="checkbox" id="item-0-<%=i%>" />
                    <label class = "lbl-item h1" for="1item-0-<%=i%>">
                        <%=row['sector_type']%>
                    </label>
                    <!--Блок вывода списка участков-->
                    <ul>
                    <% var j=0;
                    for(var sector_index = row_index; sector_index<obj.length; sector_index++,j++){
                        var row =obj[sector_index];
                        if(cur_sector_type!=row['sector_type'])
                        {
                            cur_sector_type=row['sector_type'];
                            row_index--;
                            break;
                        }
                        row_index++;%>
                    <li class = 'h2'>
                            <label class = 'lbl-plus' for="item-0-<%=i%>-<%=j%>">&nbsp;</label>
                            <input class = "li" type="checkbox" id="item-0-<%=i%>-<%=j%>" />
                            <label class = "lbl-item h2" for="1item-0-<%=i%>-<%=j%>">
                                [<%=row['sector_code']%>] <%=row['sector_name']%>
                            </label>
                            <!--Блок вывода списка работ-->
                            <ul>
                            <% var k=0;
                            for(var work_index = sector_index; work_index<obj.length; work_index++, k++){
                                var row =obj[work_index];
                                if(cur_sector_id!=row['sector_id'])
                                {
                                    cur_sector_id=row['sector_id'];
                                    row_index--;
                                    sector_index--;
                                    break;
                                }
                                row_index++;
                                sector_index++;%>
                                <li class = 'lbl-info'>
                                    <span class = "work-item item" data-id="<%=row['work_id']%>">
                                        [<%=row['work_code']%>] <%=row['work_name']%>
                                    </span>
                                </li>
                            <%}%>
                            </ul>
                            <!--Конец блока вывода списка работ-->
                    </li>
                    <%}%>
                    </ul>
                    <!--Конец блока вывода списка работ-->
                </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>

<!--MATERIALS DATA TEMPLATE -->
<script id="dataTemplateMaterials" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
        <h5>Нет данных. Обновите страницу</h5>
    <%}
    else{
        var cur_group = obj[0]['group_id'];%>
        <div class = 'css-treeview'>
            <ul>
                <% var i = 0;
                for (var row_index = 0; row_index<obj.length; row_index++, i++){
                var row =obj[row_index];%>
                <li class = 'h1'>
                    <label class = 'lbl-plus' for="item-1-<%=i%>">&nbsp;</label>
                    <input class = "li" type="checkbox" id="item-1-<%=i%>" />
                    <label class = "lbl-item h1" for="1item-1-<%=i%>">
                        <input type="checkbox" class = "cb cb-material-all"  />
                        [<%=row['group_code']%>] <%=row['group_name']%>
                    </label>
                    <!--Блок вывода списка материалов-->
                    <ul>
                    <% var j=0;
                    for(var material_index = row_index; material_index<obj.length; material_index++,j++){
                        var row =obj[material_index];
                        if(cur_group!=row['group_id'])
                        {
                            cur_group=row['group_id'];
                            row_index--;
                            break;
                        }
                        row_index++;%>
                         <li class = 'lbl-info'>
                                    <label><input type="checkbox" class = "cb cb-material" data-id = "<%=row['material_id']%>" /><span class = "material-item item">[<%=row['material_code']%>] <%=row['material_name']%></span></label>
                         </li>
                    <%}%>
                    </ul>
                    <!--Конец блока вывода списка маиериалов-->
                </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>

<!--MATERIALS DATA TEMPLATE -->
<script id="dataTemplateMaterials" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
        <h5>Нет данных. Обновите страницу</h5>
    <%}
    else{%>
        Здесь будут данные
    <%}%>
</script>

<div id="conformity" style = "display:none;">
    <div class="box-container">
            <div class="box-wrapper">
               <div class="col1">
                        <div class = "row hidden-print">
                            <div  class="span12" style = "width:90%;">
                                <div class="navbar">
                                    <div class="navbar-inner" style=  "padding-top:10px" >
                                        <button value = "collapsed" data-type="works" class="btn btn-collapse-works btn-collapse" style = "margin:0px 0px 3px 0px;"><i class="icon-folder-close"></i>&nbsp;&nbsp;Расскрыть группы</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <!-- Бокс для вывода данных по участкам и работам-->
                        <div class="data-body works-data-body"></div>
               </div>
               <div class="col2">
                        <div class = "row hidden-print">
                            <div  class="span12" style = "width:90%;">
                                <div class="navbar">
                                    <div class="navbar-inner" style=  "padding-top:10px" >
                                        <button value = "collapsed" class="btn btn-collapse-materials btn-collapse" data-type="materials" style = "margin:0px 0px 3px 0px;">
                                            <i class="icon-folder-close"></i>&nbsp;&nbsp;Расскрыть группы
                                        </button>
                                        <button value = "hide" class="btn btn-show" style = "margin:0px 0px 3px 10px;">
                                            <i class="fa fa-eye"></i>&nbsp;&nbsp;Скрыть не выбранные
                                        </button>
                                        <button value = "hide" class="btn btn-materials-editor" style = "margin:0px 0px 3px 10px;">
                                            <i class="fa fa-pencil-square-o"></i>&nbsp;&nbsp;Редактор материалов
                                        </button>
                                        <button value = "hide" class="btn btn-close-materials-editor" style = "margin:0px 0px 3px 10px; display: none;">
                                            <i class="fa fa-times"></i>&nbsp;&nbsp;Выйти из редактора материалов
                                        </button>
                                </div>
                        </div>
                        <!-- Бокс для вывода списка данных по материалам-->
                        <div class="data-body materials-data-body"></div>
                        <!-- Бокс для вывода формы редактирования материала-->
                        <div class="data-editor materials-data-editor" id = "materials-data-editor" style = "display:none">
                            <ul class="nav nav-tabs" style = "font-size:12px; margin-top:10px;">
                                  <li class="active"><a href="#tab-edit-material" data-toggle="tab">Редактирование существующего материала</a></li>
                                  <li><a href="#tab-add-new-material" data-toggle="tab">Добавление нового материала</a></li>
                            </ul>
                            <div class="tabbable" style = "min-height:600px;">
                                <div class="tab-content" style = "overflow:initial;">
                                    <div class="tab-pane active" id="tab-edit-material">
                                        <div class = "line" id = "pnl_search_material_form_container"></div>
                                        <div class = "line" id = "pnl_edit_material_form_container"></div>
                                    </div>
                                    <div class="tab-pane" id="tab-add-new-material">
                                        <div class = "line" id = "pnl_add_material_form_container"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
               </div>
            </div>
    </div>
</div>
