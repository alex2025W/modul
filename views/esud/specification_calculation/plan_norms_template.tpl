<!--PLAM NORMS DATA TEMPLATE -->
<script id="dataPlanNormsTemplate" type="text/template">
    <%if(obj==null || obj.length==0 || Routine.isEmpty(obj) ){%>
        <h5>Нет  данных.</h5>
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
                                                    if(row.properties[i_p]['is_optional'] && !row.properties[i_p]['is_techno'])
                                                        unique_props_str += row.properties[i_p]['name'] + ": " + row.properties[i_p]['value'] +  ((row.properties[i_p]['unit'] && row.properties[i_p]['unit']!='?')?' ' +row.properties[i_p]['unit']:'') + '; ';
                                            }%>
                                        <tr data-number = "<%=row['number']%>" data-config-number = "<%=row['config_number']%>" >
                                            <td style = "width:10%"><%=(row['number'])?row['number']+'&nbsp;':''%></td>
                                            <td style = "width:40%"><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
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
