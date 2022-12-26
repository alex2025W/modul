%def scripts():
    <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/esudcalculation.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">

    <script src="/static/scripts/esudcalculation/app.js?v={{version}}"></script>
    <script src="/static/scripts/esudcalculation/model_item.js?v={{version}}"></script>
    <script src="/static/scripts/esudcalculation/view_productinfo.js?v={{version}}"></script>
    <script src="/static/scripts/esudcalculation/view_controlpanel.js?v={{version}}"></script>
    <script src="/static/scripts/esudcalculation/view_data.js?v={{version}}"></script>

    <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="/static/scripts/routine.js?v={{version}}"></script>
    <script>$(function() {
            $.ajaxSetup({timeout:50000});
            bootbox.setDefaults({locale: "ru",});
            $("#esud_calculation").show();
             App.initialize({{! data }},{{! system_objects }});
        });
    </script>
%end
%rebase master_page/base page_title='ЭСУД. Расчеты', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

<!--PRODUCT INFORMATION TEMPLATE-->
<script id="productItemInfoTemplate" type="text/template">
    <% if(obj){
            var p1 = "";
            var p2="";
            var unique_props_str = "";
            for(var i in obj.properties) {
            if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="") {
                  p1 = obj.properties[i].value.value
            }
            if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="") {
                p2 = obj.properties[i].value.value
            }
            if(obj.properties[i]['is_modefied'] && !obj.properties[i]['is_system'])
                        unique_props_str += obj.properties[i]['name'] + ": " + obj.properties[i]['value'] +  ((obj.properties[i]['unit'] && obj.properties[i]['unit']!='?')?' ' +obj.properties[i]['unit']:'') + '; ';
     }} %>
    <a href="/esud#c1__go__<%=_id%>&c1__activate__true&c1__highlight__&c2__go__&c2__activate__false&c2__highlight__" title = "перейти к продукции"><%=(obj && 'number' in obj && number)?number+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></a>
</script>
<!--TEMPLATE SIDE OBJECT TEMPLATE -->
<script id="templateSideObject" type="text/template">
    <tr>
          <% var p1 = ""; var p2=""; var unique_props_str = "";
          if(obj){
                for(var i_pp in obj['object'].properties) {
                        if(obj['object'].properties[i_pp].datalink && obj['object'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                              p1 = obj['object'].properties[i_pp].value;
                        }
                        if(obj['object'].properties[i_pp].datalink && obj['object'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                            p2 = obj['object'].properties[i_pp].value;
                        }
                        if(obj['object'].properties[i_pp]['is_modefied'] && !obj['object'].properties[i_pp]['is_system'])
                        unique_props_str += obj['object'].properties[i_pp]['name'] + ": " + obj['object'].properties[i_pp]['value'] +  ((obj['object'].properties[i_pp]['unit'] && obj['object'].properties[i_pp]['unit']!='?')?' ' +obj['object'].properties[i_pp]['unit']:'') + '; ';
            }} %>
        <td style = "width:80%">
            <%=('number' in obj['object']['node'] && obj['object']['node']['number'])?obj['object']['node']['number']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=obj['object']['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %>
        </td>
        <td style = "width:10%"><%=obj['value']%></td>
        <td style = "width:10%"><%=obj['object']['count']['unit']%></td>
    </tr>
</script>
<!--BUY ITEMS DATA TEMPLATE -->
<script id="dataBuyTemplate" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
        <h5>Данное изделие не содержит покупных изделий.</h5>
    <%}
    else{%>
        <table class = "data bordered">
            <thead>
                <tr>
                    <td style = "width:40%">Покупное изделие</td>
                    <td style = "width:20%">Инд. хар-ки</td>
                    <td style = "width:10%">Ед.&nbsp;изм.</td>
                    <td style = "width:10%">Объем по нормам</td>
                    <td style = "width:10%">Кол. шт.</td>
                    <td style = "width:10%">Объем на закупку</td>
                </tr>
            </thead>
        </table>
        <div class = 'css-treeview'>
            <ul>
                <% var i = 0;
                        for (var row_index in obj)
                        {
                            i++;
                            var row =obj[row_index];
                            var pp1 = ""; var pp2="";
                            var unique_props_str = '';
                            for(var i_pp in row['elem'].properties) {
                                    if(row['elem'].properties[i_pp].datalink && row['elem'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                          pp1 = row['elem'].properties[i_pp].value;
                                          //console.log(pp1);
                                    }
                                    if(row['elem'].properties[i_pp].datalink && row['elem'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                        pp2 = row['elem'].properties[i_pp].value;
                                    }
                                    if(row['elem'].properties[i_pp]['is_modefied'] && !row['elem'].properties[i_pp]['is_system'])
                                            unique_props_str += row['elem'].properties[i_pp]['name'] + ": " + row['elem'].properties[i_pp]['value'] +  ((row['elem'].properties[i_pp]['unit'] && row['elem'].properties[i_pp]['unit']!='?')?' ' +row['elem'].properties[i_pp]['unit']:'') + '; ';
                            }%>
                <li class = 'h1' data-specification_key = "<%=row['elem']['specification_key']%>">
                    <label class = 'lbl-plus' for="item-<%=i%>">&nbsp;</label>
                    <input type="checkbox" id="item-<%=i%>" />
                    <label class = "lbl-item h1" for="1item-<%=i%>">
                        <table class = "data">
                            <tbody>
                                <tr>
                                    <td style = "width:40%"><%=(row['elem']['node']['number'])?row['elem']['node']['number']+'&nbsp;':''%><%= pp1&&App.showShifrs?('<span class="lbl-light">['+pp1+']</span>&nbsp;'):'' %><%=row['elem']['node']['name']%><%= pp2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+pp2+']</span>'):'' %></td>
                                    <td style = "width:20%; font-size:12px; " ><%=unique_props_str%></td>
                                    <td style = "width:10%"><%=row['elem']['count']['unit']%></td>
                                    <td style = "width:10%"><%=(Routine.isDiggit(row['elem']['count']['value']))?Routine.addCommas(row['elem']['count']['value'].toFixed(4).toString()," "):row['elem']['count']['value']%></td>
                                    <td class = "in-object-count" style = "width:10%"><%=(row['elem']['vol_amount'] && !('templates_combs' in row))?((Routine.isDiggit(row['elem']['vol_amount']))?Routine.addCommas(row['elem']['vol_amount'].toFixed(4).toString()," "):row['elem']['vol_amount']):'-'%></td>
                                    <td class = "in-object-for-buy" style = "width:10%"><%=(row['elem']['vol_full'])?((Routine.isDiggit(row['elem']['vol_full']))?Routine.addCommas(row['elem']['vol_full'].toFixed(4).toString()," "):row['elem']['vol_full']):'-'%></td>
                                </tr>
                            </tbody>
                        </table>
                    </label>
                    <ul>
                        <!--Список объектов. которые необходимо изготовить-->
                        <% if (('templates_combs' in row)){%>
                        <li class = 'h2'>
                            <label class = 'lbl-plus' for="item-<%=i%>-0">&nbsp;</label>
                            <input type="checkbox" id="item-<%=i%>-0" />
                            <label class = "lbl-item h2" for="1item-<%=i%>-0">
                                <table class = "data">
                                    <tbody>
                                        <tr>
                                            <td style = "width:80%">Применяется в изготовлении</td>
                                            <td style = "width:10%"></td>
                                            <td style = "width:10%"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </label>
                            <ul>
                                <li>
                                <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td>Наименование</td>
                                        <td>Инд. хар-ки</td>
                                        <td>Требуется</td>
                                        <td>Будет изг.</td>
                                        <td>Ед. изм.</td>
                                    </tr>
                                </thead>
                                <tbody>
                                <%var j=0;
                                for (var row_to_produce_index in row['items'])
                                    {
                                        j++;
                                        var row_to_produce = row['items'][row_to_produce_index];
                                        var p1 = ""; var p2=""; var unique_props_str = "";
                                        for(var i_p in row_to_produce.properties) {
                                                if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                      p1 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                    p2 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p]['is_modefied'] && !row_to_produce.properties[i_p]['is_system'])
                                                        unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                        }%>
                                    <tr data-specification_key = "<%=row_to_produce['specification_key']%>">
                                        <td style = "width:50%"><%=(row_to_produce['node']['number'])?row_to_produce['node']['number']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                        <td style = "width:20%"><%=unique_props_str%></td>
                                        <td style = "width:10%"><%=(Routine.isDiggit(row_to_produce['count']['value']))?Routine.addCommas(row_to_produce['count']['value'].toFixed(4).toString()," "):row_to_produce['count']['value']%></td>
                                        <!--будет изготовлено-->
                                        <td style = "width:10%" class = "td-will-make"><%=(Routine.isDiggit(row_to_produce['count']['value']))?Routine.addCommas(row_to_produce['count']['value'].toFixed(4).toString()," "):row_to_produce['count']['value']%></td>
                                        <td style = "width:10%"><%=row_to_produce['count']['unit']%></td>
                                    </tr>
                                <%}%>
                                </tbody>
                                </table>
                                </li>
                            </ul>
                        </li>
                        <%}%>
                        <!--Конец блока списка объектов. которые необходимо изготовить-->

                        <!--Список расчета объемов и допусков-->
                        <% if (!('templates_combs' in row)){%>
                       <li class = 'h2 box-vol-calculations'>
                            <label class = 'lbl-plus' for="item-<%=i%>-10">&nbsp;</label>
                            <input type="checkbox" id="item-<%=i%>-10" />
                            <label class = "lbl-item h2" for="1item-<%=i%>-10">
                                <table class = "data">
                                    <tbody>
                                        <tr>
                                            <td style = "width:80%">Расчет объемов</td>
                                            <td style = "width:10%"></td>
                                            <td style = "width:10%"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </label>
                            <ul>
                                <li>
                                <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td style = "width:50%">Изделие</td>
                                        <td style = "width:20%">Инд. хар-ки</td>
                                        <td style = "width:10%">Объем по нормам</td>
                                        <td style = "width:10%">Кол. шт.</td>
                                        <td style = "width:10%">Объем на закупку</td>
                                    </tr>
                                </thead>
                                 <tbody>
                                <%var j=0;
                                for (var row_to_produce_index in row['items'])
                                {
                                        j++;
                                        var row_to_produce = row['items'][row_to_produce_index];
                                        var p1 = ""; var p2=""; var unique_props_str = "";
                                        for(var i_p in row_to_produce.properties) {
                                                if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                      p1 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                    p2 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p]['is_modefied'] && !row_to_produce.properties[i_p]['is_system'])
                                                        unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                        }%>
                                    <tr data-specification_key = "<%=row_to_produce['specification_key']%>">
                                        <td style = "width:50%"><%=(row_to_produce['node']['number'])?row_to_produce['node']['number']+'&nbsp;':''%><%= p1?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                        <td style = "width:20%"><%=unique_props_str%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_bynorm'])?((Routine.isDiggit(row_to_produce['vol_bynorm']))?Routine.addCommas(row_to_produce['vol_bynorm'].toFixed(4).toString()," "):row_to_produce['vol_bynorm']):'-'%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_amount'])?((Routine.isDiggit(row_to_produce['vol_amount']))?Routine.addCommas(row_to_produce['vol_amount'].toFixed(4).toString()," "):row_to_produce['vol_amount']):'-'%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_full'])?((Routine.isDiggit(row_to_produce['vol_full']))?Routine.addCommas(row_to_produce['vol_full'].toFixed(4).toString()," "):row_to_produce['vol_full']):'-'%></td>
                                    </tr>
                                <%}%>
                                </tbody>
                                </table>
                                </li>
                            </ul>
                        </li>
                        <%}%>
                        <!--Конец блока списка расчетов объемов и допусков-->

                        <!--Список готовых объектов, получаемых в результате применения шаблонов-->
                        <li class = 'h2 combo-template-side-objects-box' style = 'display:none'>
                            <label class = 'lbl-plus' for="item-<%=i%>-1">&nbsp;</label>
                            <input type="checkbox" id="item-<%=i%>-1" />
                            <label class = "lbl-item h2" for="1item-<%=i%>-1">
                                <table class = "data">
                                    <tbody>
                                        <tr>
                                            <td style = "width:80%">Дополнительные объекты от применения комбинации шаблонов</td>
                                            <td style = "width:10%"></td>
                                            <td style = "width:10%"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </label>
                            <ul>
                                <li>
                                <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td>Наименование</td>
                                        <td>Будет изг.</td>
                                        <td>Ед. изм.</td>
                                    </tr>
                                </thead>
                                <tbody class = "body-side-objects">
                                    <!--список побочных объектов-->
                                </tbody>
                                </table>
                                </li>
                            </ul>
                        </li>
                        <!--Конец блока списка объектов. которые необходимо изготовить-->

                         <!-- Список комбинаций шаблонов, если необходим -->
                        <% if('templates_combs' in row){
                        // если нет комбинаций, то это ошибка
                        if(row['templates_combs'].length==0){%>
                            <li class = 'h2'>
                                <ul>
                                    <li class = 'lbl-info'><span class = "color-red">Ошибка! Нет подходящих вариантов раскроя.</span></li>
                                </ul>
                            </li>
                        <%}
                        else
                        {%>
                            <li class = 'h2'>
                                <label class = 'lbl-plus' for="item-<%=i%>-2">&nbsp;</label>
                                <input type="checkbox" id="item-<%=i%>-2" />
                                <label class = "lbl-item h2" for="1item-<%=i%>-2">
                                    <table class = "data">
                                    <tbody>
                                        <tr>
                                            <td style = "width:80%">Варианты раскроя</td>
                                            <td style = "width:10%; color:#ccc; font-size:12px;" >Кол-во</td>
                                            <td style = "width:10%; color:#ccc; font-size:12px;">Ед.&nbsp;изм.</td>
                                        </tr>
                                    </tbody>
                                </table>
                                </label>
                                <ul>
                                    <li>
                                        <% var comb_i = 0;
                                         for(var row_comb_index in row['templates_combs'])
                                         {
                                         var row_comb = row['templates_combs'][row_comb_index]
                                         comb_i++;%>
                                            <li class = 'h3'>
                                                <label class = 'lbl-plus' for="item-<%=i%>-2-<%=comb_i%>">&nbsp;</label>
                                                <input type="checkbox" id="item-<%=i%>-2-<%=comb_i%>" />
                                                <label class = "lbl-item h3" for="1item-<%=i%>-2-<%=comb_i%>">
                                                    <table class = "data">
                                                        <tbody>
                                                            <tr>
                                                                <td style = "width:80%; border-top:solid 1px #ddd;" >
                                                                    <input type="checkbox" class="cb cb-templates-combo" data-combination_id ="<%=row_comb['_id']%>" />
                                                                    <span class="lbl">Вариант № <%=(comb_i)%></span>
                                                                </td>
                                                                <td style = "width:10%; ; border-top:solid 1px #ddd;"><%=(Routine.isDiggit(row_comb['final_material_count']))?Routine.addCommas(row_comb['final_material_count'].toFixed(4).toString()," "):row_comb['final_material_count']%></td>
                                                                <td style = "width:10%; border-top:solid 1px #ddd;"><%=row_comb['unit']%></td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </label>
                                                <ul>
                                                    <li>
                                                        <!--Блок вывода списка шаблонов -->
                                                        <table class = 'in-info'>
                                                        <thead>
                                                            <tr>
                                                                <td>Наименование</td>
                                                                <td>Будет изг.</td>
                                                                <td>Ед. изм.</td>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                        <% var temp_i = 0;
                                                         for(var row_templ_index in row_comb['templates'])
                                                         {
                                                         var row_templ = row_comb['templates'][row_templ_index]
                                                         temp_i++;%>
                                                         <tr class = "head">
                                                            <td style = "width:80%"><%=row_templ['template']['node']['name']%> (x<%=row_templ['qty']%>)</td>
                                                            <td style = "width:10%"></td>
                                                            <td style = "width:10%"></td>
                                                         </tr>
                                                         <!--Блок вывода списка выходящих изделий в шаблоне -->
                                                         <%
                                                         for(var row_templ_obj_index in row_templ['template']['children'])
                                                         {
                                                         var row_templ_obj = row_templ['template']['children'][row_templ_obj_index];
                                                         if(row_templ_obj['node']['type']=='product' && !row_templ_obj['node']['is_input'])
                                                         {
                                                              var p1 = ""; var p2=""; var unique_props_str = "";
                                                              for(var i_p in row_templ_obj.properties) {
                                                                        if(row_templ_obj.properties[i_p].datalink && row_templ_obj.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                                              p1 = row_templ_obj.properties[i_p].value;
                                                                        }
                                                                        if(row_templ_obj.properties[i_p].datalink || row_templ_obj.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                                            p2 = row_templ_obj.properties[i_p].value;
                                                                        }
                                                                        if(row_templ_obj.properties[i_p]['is_modefied'] && !row_templ_obj.properties[i_p]['is_system'])
                                                                                unique_props_str += row_templ_obj.properties[i_p]['name'] + ": " + row_templ_obj.properties[i_p]['value'] +  ((row_templ_obj.properties[i_p]['unit'] && row_templ_obj.properties[i_p]['unit']!='?')?' ' +row_templ_obj.properties[i_p]['unit']:'') + '; ';
                                                                }%>
                                                            <tr>
                                                                <td style = "width:80%"><%=(row_templ_obj['node']['number'])?row_templ_obj['node']['number']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_templ_obj['node']['name']%><%= p2?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                                                <td style = "width:10%"><%=(Routine.isDiggit(row_templ_obj['count']['value']))?Routine.addCommas(row_templ_obj['count']['value'].toFixed(4).toString()," "):row_templ_obj['count']['value']%></td>
                                                                <td style = "width:10%"><%=row_templ_obj['count']['unit']%></td>
                                                            </tr>

                                                         <%}%><!--end if-->
                                                         <%}%><!--end for-->
                                                         <!--Конец блока вывода списка выходящих изделий в шаблоне -->
                                                         <%}%><!--end for-->
                                                        </tbody>
                                                        </table>
                                                        <!--Конец блок вывода списка шаблонов -->
                                                    </li>
                                                </ul>
                                            </li>
                                        <%}%><!--end for-->
                                    </li>
                                </ul>
                            </li>
                        <%}%><!--end if-->
                        <%}%><!--end if-->
                        <!--Конец блока вывода списка конфигураций шаблонов-->
                    </ul>
                </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>

<!--OWN ITEMS DATA TEMPLATE -->
<script id="dataOwnTemplate" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
        <h5>Данное изделие не содержит собственных изделий.</h5>
    <%}
    else{%>
        <div class = 'css-treeview' style = "border-top:solid 1px #ddd;">
            <ul>
                <% var i = 0;
                for (var sector_name in obj)
                {
                    i++;
                    var items =obj[sector_name];%>
                    <li class = 'h1' data-sector_key = "<%=sector_name%>">
                        <label class = 'lbl-plus' for="own-item-<%=i%>">&nbsp;</label>
                        <input type="checkbox" id="own-item-<%=i%>" class = "cb-item" />
                        <label class = "lbl-item h1" for="1item-<%=i%>">
                            <table class = "data">
                                <tbody>
                                    <tr>
                                        <td style = "width:100%"><%=sector_name%></td>
                                    </tr>
                                </tbody>
                            </table>
                        </label>
                        <ul>
                            <!--Список объектов. которые необходимо изготовить-->
                                    <li>
                                    <table class = 'in-info'>
                                    <thead>
                                        <tr>
                                            <td>Артикул</td>
                                            <td>Название</td>
                                            <td>Кол. шт</td>
                                            <td>Получатель</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    <%var j=0;
                                        for (var row_to_produce_index in items)
                                        {
                                            j++;
                                            var row_to_produce = items[row_to_produce_index]['elem'];
                                            var p1 = ""; var p2=""; var unique_props_str = "";
                                            for(var i_p in row_to_produce.properties) {
                                                    if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                          p1 = row_to_produce.properties[i_p].value
                                                    }
                                                    if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                        p2 = row_to_produce.properties[i_p].value
                                                    }
                                                    if(row_to_produce.properties[i_p]['is_modefied'] && !row_to_produce.properties[i_p]['is_system'])
                                                            unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                            }%>
                                        <tr data-specification_key = "<%=row_to_produce['specification_key']%>" style = "<%=row_to_produce['sector']['value']== row_to_produce['parent_sector']['value']?'display:none':''%>">
                                            <td style = "width:10%"><%=(row_to_produce['node']['number'])?row_to_produce['node']['number']+'&nbsp;':''%></td>
                                            <td style = "width:50%"><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                            <td style = "width:10%"><%=(Routine.isDiggit(row_to_produce['count']['value']))?Routine.addCommas(row_to_produce['count']['value'].toFixed(4).toString()," "):row_to_produce['count']['value']%></td>
                                            <!--будет изготовлено-->
                                            <td style = "width:30%"><%=row_to_produce['parent_sector']['value']%></td>
                                        </tr>
                                    <%}%>
                                    </tbody>
                                    </table>
                                    </li>
                            <!--Конец блока списка объектов. которые необходимо изготовить-->
                        </ul>
                    </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>

<!--PLAM NORMS DATA TEMPLATE -->
<script id="dataPlanNormsTemplate" type="text/template">
    <%
    if(obj==null || obj.length==0){%>
        <h5>Данное изделие не содержит покупных изделий.</h5>
    <%}
    else{%>
        <div class = 'css-treeview' style = "border-top:solid 1px #ddd;">
            <ul>
                <% var i = 0;
                for (var sector_name in obj)
                {
                    i++;
                    var items =obj[sector_name];%>
                    <li class = 'h1' data-sector_key = "<%=sector_name%>">
                        <label class = 'lbl-plus' for="plannorm-item-<%=i%>">&nbsp;</label>
                        <input type="checkbox" id="plannorm-item-<%=i%>" class = "cb-item" />
                        <label class = "lbl-item h1" for="1item-<%=i%>">
                            <table class = "data">
                                <tbody>
                                    <tr>
                                        <td style = "width:100%"><%=sector_name%></td>
                                    </tr>
                                </tbody>
                            </table>
                        </label>
                        <ul>
                            <!--Список объектов, которые необходимо закупить-->
                                    <li>
                                    <table class = 'in-info'>
                                    <thead>
                                        <tr>
                                            <td>Артикул</td>
                                            <td>Название</td>
                                            <td>Инд. хар-ки</td>
                                            <td>Ед. изм</td>
                                            <td>объем по нормам</td>
                                        </tr>
                                    </thead>
                                    <tbody>
                                    <%var j=0;
                                        for (var row_index in items)
                                        {
                                            j++;
                                            var row = items[row_index];
                                            var p1 = ""; var p2="";
                                            var unique_props_str = "";
                                            for(var i_p in row.properties) {
                                                    if(row.properties[i_p].datalink && row.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                          p1 = row.properties[i_p].value
                                                    }
                                                    if(row.properties[i_p].datalink || row.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                        p2 = row.properties[i_p].value
                                                    }
                                                    if(row.properties[i_p]['is_modefied'] && !row.properties[i_p]['is_system'])
                                                        unique_props_str += row.properties[i_p]['name'] + ": " + row.properties[i_p]['value'] +  ((row.properties[i_p]['unit'] && row.properties[i_p]['unit']!='?')?' ' +row.properties[i_p]['unit']:'') + '; ';
                                            }%>
                                        <tr data-specification_key = "<%=row['specification_key']%>" >
                                            <td style = "width:10%"><%=(row['node']['number'])?row['node']['number']+'&nbsp;':''%></td>
                                            <td style = "width:40%"><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                            <td style = "width:25%"><%= unique_props_str %></td>
                                            <td style = "width:10%"><%=row['count']['unit']%></td>
                                            <td style = "width:15%"><%=(Routine.isDiggit(row['count']['value']))?Routine.addCommas(row['count']['value'].toFixed(4).toString()," "):row['count']['value']%></td>
                                        </tr>
                                    <%}%>
                                    </tbody>
                                    </table>
                                    </li>
                            <!--Конец блока списка объектов, которые необходимо закупить-->
                        </ul>
                    </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>


<div id="esud_calculation" style = "display:none">
    <div  class="span12">
        <!--Product Info-->
        <div  id = "product_info">Информация о продукции не найдена</div>
        <div class="navbar" id="navigationButtons">
            <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
                <div class="input-prepend input-append">
                        <span class="add-on"><b class="icon-list-alt"></b></span>
                        <input type="text" class="tb-count"  placeholder="Количество" value = "1" disabled />
                        <button class="btn btn-calculate" disabled >Рассчитать</button>
                </div>

            </div>
        </div>
        <h5>Введите количество и нажмите Рассчитать.</h5>
        <div id = "esud_calculation_body" class="data-body">
            <div class="tabbable">
                <ul class="nav nav-tabs">
                      <li class="active"><a href="#tab-plan-norms" data-toggle="tab">Нормы расхода</a></li>
                      <li><a href="#tab-calculation" data-toggle="tab">Изделия покупные</a></li>
                      <li><a href="#tab-task-to-produce" data-toggle="tab">Задание на производство</a></li>
                </ul>
                <div class="tab-content">
                        <div class="tab-pane" id="tab-calculation">
                                <div class = "line data-container"  id = "esud_calculation_data_container"></div>
                        </div>
                        <div class="tab-pane" id="tab-task-to-produce">
                            <div class = "line data-container"  id = "esud_task_to_product_data_container"></div>
                        </div>
                        <div class="tab-pane active" id="tab-plan-norms">
                            <div class = "line data-container"  id = "esud_plan_norms_data_container"></div>
                        </div>
            </div>
        </div>
    </div>
    </div>
</div>
