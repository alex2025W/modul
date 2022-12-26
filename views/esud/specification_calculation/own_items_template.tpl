<!--OWN ITEMS DATA TEMPLATE(ЗАДАНИЕ НА ПРОИЗВОДСТВО) -->
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
                        <label class = "lbl-item h1" for="1own-item-<%=i%>">
                            <table class = "data">
                                <tbody>
                                    <tr>
                                        <td style = "width:100%"><%=sector_name%></td>
                                    </tr>
                                </tbody>
                            </table>
                        </label>
                        <ul>
                        <li class = 'h3'>
                            <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td style = "width:3%">№</td>
                                        <td style = "width:7%">Артикул</td>
                                        <td style = "width:37.7%">Название</td>
                                        <td style = "width:7%">Вес на ед., кг</td>
                                        <td style = "width:7%">Полн. вес, кг</td>
                                        <td style = "width:7%">Треб. шт</td>
                                        <td style = "width:7%">Со склада</td>
                                        <td style = "width:10%">В производство</td>
                                        <td style = "width:25%">Получатель</td>
                                    </tr>
                                </thead>
                            </table>
                        </li>

                            <!--Список объектов. которые необходимо изготовить-->
                            <%var j=0;
                            var itogo_count_to_produce = 0;
                            var itogo_count_from_stock = 0;
                            var itogo_need_count = 0;
                            var itogo_weight = 0;
                            var itogo_full_weight = 0;

                            for (var row_to_produce_index in items)
                            {
                                j++;
                                var templates = items[row_to_produce_index]['templates'];
                                var row_to_produce = JSON.parse(JSON.stringify(items[row_to_produce_index]['elem']));

                                if(row_to_produce['selected_specification'])
                                {
                                    var spec_copy = row_to_produce['selected_specification'];
                                    spec_copy['count']['value'] = row_to_produce['count']['value'];
                                    spec_copy['count_to_produce'] = {'value': row_to_produce['count_to_produce']['value']} ;
                                    spec_copy['parent_sector'] = row_to_produce['parent_sector'];
                                    spec_copy['sector'] = row_to_produce['sector'];
                                    spec_copy['to_stock'] = row_to_produce['to_stock'];
                                    //spec_copy['specifications'] = row_to_produce['specifications'];
                                    spec_copy['has_specification'] = true;
                                    spec_copy['count_from_stock'] = row_to_produce['count_from_stock'];
                                    row_to_produce = spec_copy;
                                }

                                // подсчет итоговых значений
                                if(row_to_produce['count_to_produce'])
                                    itogo_count_to_produce+=Routine.strToFloat(row_to_produce['count_to_produce']['value']);
                                if(row_to_produce['count_from_stock'])
                                    itogo_count_from_stock+=Routine.strToFloat(row_to_produce['count_from_stock']['value']);
                                if(row_to_produce['count'])
                                    itogo_need_count+=Routine.strToFloat(row_to_produce['count']['value']);
                                if(row_to_produce['weight_per_unit'])
                                    itogo_weight+=Routine.strToFloat(row_to_produce['weight_per_unit']);
                                    itogo_full_weight+=Routine.strToFloat(row_to_produce['weight_per_unit']) * Routine.strToFloat(row_to_produce['count']['value']);

                                var p1 = ""; var p2=""; var unique_props_str = "";
                                for(var i_p in row_to_produce.properties) {
                                        if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                              p1 = row_to_produce.properties[i_p].value
                                        }
                                        if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                            p2 = row_to_produce.properties[i_p].value
                                        }
                                        if(row_to_produce.properties[i_p]['is_optional'] && !row_to_produce.properties[i_p]['is_techno'])
                                                unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                }%>

                            <li class = 'h3' data-number = "<%=row_to_produce['number']%>" data-config-number = "<%=row_to_produce['config_number']%>" style = 'border-bottom:dotted 1px #ccc'>
                                <label class = 'lbl-plus' for="own-item-<%=i%>-<%=j%>" style = "<%=templates && templates.length>0?'':'display:none'%>" >&nbsp;</label>
                                <input type="checkbox" id="own-item-<%=i%>-<%=j%>" />
                                <label class = "lbl-item h3 <%=templates && templates.length>0?'':'lbl-item-hidden'%>" for="1own-item-<%=i%>-<%=j%>">
                                    <table class = 'data'>
                                        <tbody>
                                            <tr data-number = "<%=row_to_produce['number']%>" data-config-number = "<%=row_to_produce['config_number']%>" style = "<%=row_to_produce['sector']['name']== row_to_produce['parent_sector']['name']?'display:1none':''%>" class = <%= ((row_to_produce['to_stock'] && (!row_to_produce['has_specification'])?'error':'')) %> >
                                                <td style = "width:2%"><%=j%></td>
                                                <!--артикул-->
                                                <td style = "width:7%"><%=(row_to_produce['number'])?row_to_produce['number']+'&nbsp;':''%></td>
                                                <!--название-->
                                                <td style = "width:38%"><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                                <!--вес-->
                                                <td style = "width:7%"><%=((row_to_produce['weight_per_unit'])? (Routine.isDiggit(row_to_produce['weight_per_unit']))?Routine.addCommas(row_to_produce['weight_per_unit'].toFixed(4).toString()," "):row_to_produce['weight_per_unit']:'')%></td>
                                                <!--полный вес-->
                                                <td style = "width:7%"><%=((row_to_produce['weight_per_unit'])? (Routine.isDiggit(row_to_produce['weight_per_unit']))?Routine.addCommas((row_to_produce['weight_per_unit']*row_to_produce['count']['value']).toFixed(4).toString()," "):row_to_produce['weight_per_unit']:'')%></td>
                                                <!--требуется всего-->
                                                <% var need_count = 0;
                                                        if(row_to_produce['count']['origin_count'])
                                                        {
                                                            need_count  = row_to_produce['count']['origin_count'];
                                                        }
                                                        else
                                                        {
                                                            need_count  = row_to_produce['count']['value'];
                                                        }%>
                                                <td style = "width:7%"><%=((!row_to_produce['to_stock'])? (Routine.isDiggit(need_count))?Routine.addCommas(need_count.toFixed(4).toString()," "):need_count:'')%></td>
                                                <!--объем со склада-->
                                                <td style = "width:7%"><%= ((row_to_produce['count_from_stock'] )?(Routine.isDiggit(row_to_produce['count_from_stock']['value']))?Routine.addCommas(row_to_produce['count_from_stock']['value'].toFixed(4).toString()," "):row_to_produce['count_from_stock']['value']: '')%></td>
                                                <!--объем на производство-->
                                                <td style = "width:10%"><%=((row_to_produce['count_to_produce'])?(Routine.isDiggit(row_to_produce['count_to_produce']['value']))?Routine.addCommas(row_to_produce['count_to_produce']['value'].toFixed(4).toString()," "):row_to_produce['count_to_produce']['value']:'')%></td>
                                                <!--участок-->
                                                <td style = "width:25%"><%=row_to_produce['parent_sector']['name']%></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </label>
                                <ul>
                                    <% if(templates && templates.length>0){%>
                                    <li class = 'h3'>
                                        <label class = 'lbl-plus' for="own-item-<%=i%>-<%=j%>-1">&nbsp;</label>
                                        <input type="checkbox" id="own-item-<%=i%>-<%=j%>-1" />
                                        <label class = "lbl-item h3" for="1own-item-<%=i%>-<%=j%>-1">
                                          <table class = "data">
                                            <tbody>
                                                <tr>
                                                    <td style = "width:80%">Примененный вариант раскроя</td>
                                                    <td style = "width:10%"></td>
                                                    <td style = "width:10%"></td>
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
                                                 for(var row_templ_index in templates)
                                                 {
                                                 var row_templ = templates[row_templ_index]
                                                 temp_i++;%>
                                                 <tr class = "head">
                                                    <td style = "width:80%"><%=row_templ['template']['name']%> (x<%=row_templ['qty']%>)</td>
                                                    <td style = "width:10%"></td>
                                                    <td style = "width:10%"></td>
                                                 </tr>
                                                 <!--Блок вывода списка выходящих изделий в шаблоне -->
                                                 <%
                                                 for(var row_templ_obj_index in row_templ['template']['out_objects'])
                                                 {
                                                    var row_templ_obj = row_templ['template']['out_objects'][row_templ_obj_index];%>
                                                    <tr>
                                                        <td style = "width:80%"><%=(row_templ_obj['key'])?row_templ_obj['key']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+row_templ_obj['shifr1']+']</span>&nbsp;'):'' %><%=row_templ_obj['name']%><%= p2?('&nbsp;<span class="lbl-light">['+row_templ_obj['shifr2']+']</span>'):'' %></td>
                                                        <td style = "width:10%"><%=(Routine.isDiggit(row_templ_obj['count']))?Routine.addCommas(row_templ_obj['count'].toFixed(4).toString()," "):row_templ_obj['count']%></td>
                                                        <td style = "width:10%"><%=row_templ_obj['unit']%></td>
                                                    </tr>

                                                 <%}%><!--end for-->
                                                 <!--Конец блока вывода списка выходящих изделий в шаблоне -->
                                                 <%}%><!--end for-->
                                                </tbody>
                                                </table>
                                                <!--Конец блок вывода списка шаблонов -->
                                            </li>
                                        </ul>
                                    </li>
                                    <%}%>
                                </ul>
                            </li>
                            <%}%>
                            <li class = 'h3' style = 'border-bottom:dotted 1px #ccc'>
                                <label class = "lbl-item h3 lbl-item-hidden">
                                    <table class = 'data'>
                                        <tbody>
                                        <tr>
                                            <td style = "width:2%">&nbsp;</td>
                                            <td style = "width:7%">&nbsp;</td>
                                            <td style = "width:38%">&nbsp;</td>
                                            <td style = "width:7%"><b><%=Routine.addCommas(itogo_weight.toFixed(4).toString()," ")%></b></td>
                                            <td style = "width:7%"><b><%=Routine.addCommas(itogo_full_weight.toFixed(4).toString()," ")%></b></td>
                                            <td style = "width:7%"><b><%=itogo_need_count%></b></td>
                                            <td style = "width:7%"><b><%=itogo_count_from_stock%></b></td>
                                            <td style = "width:10%"><b><%=itogo_count_to_produce%></b></td>
                                            <td style = "width:25%">&nbsp;</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </label>
                            </li>
                        <!--Конец блока списка объектов. которые необходимо изготовить-->
                        </ul>
                    </li>
                <%}%>
            </ul>
        </div>
    <%}%>
</script>
