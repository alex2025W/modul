<!--BUY ITEMS DATA TEMPLATE -->
<script id="dataBuyTemplate" type="text/template">
    <%
    if(obj['data']==null || obj['data'].length==0){%>
        <h5>Не требуются.</h5>
    <%}
    else{
                var summ_chist_rashod = 0;
                var summ_count_from_stock = 0;
                var summ_vol_full_waste = 0;
                var summ_vol_returned_waste = 0;
                var summ_vol_not_returned_waste = 0;
                var summ_obiem_potrebnosty = 0;
                var summ_norma_rashoda = 0;%>
        <div style = "class = "line">
            <!--<label style ="float:left; padding: 5px;">Единицы отображения: </label>-->
            <select class="ddl-view-in"  style = "float: left; width:100px;">
                <option value="volume" <%=view_in=="volume"?'selected':''%>>Объем</option>
                <option value="weight" <%=view_in=="weight"?'selected':''%>>Вес</option>
                <option value="money" <%=view_in=="money"?'selected':''%>>Стоимость</option>
            </select>
        </div>
        <table class = "data bordered">
            <%if (view_in=='volume'){%>
            <thead>
                <tr>
                    <td style = "width:25%">Покупное изделие</td>
                    <td style = "width:15%">Тех. св-ва</td>
                    <td style = "width:15%">Инд. хар-ки</td>
                    <td style = "width:5%">Ед. объема</td>
                    <td style = "width:5%">Чистый расход</td>
                    <td style = "width:5%">Объем со склада</td>
                    <td style = "width:5%">Отход, всего</td>
                    <td style = "width:5%">Отход, возвратный</td>
                    <td style = "width:5%">Отход, невозвратный</td>
                    <!--<td style = "width:5%">Неопределенный отход</td>-->
                    <td style = "width:5%" title="Чистый расход + невозвратный отход">Норма расхода</td>
                    <td style = "width:5%">Объем потребности</td>
                    <td style = "width:5%">Кол. шт.</td>
                </tr>
            </thead>
            <%}else{%>
                <thead>
                <tr>
                    <td style = "width:25%">Покупное изделие</td>
                    <td style = "width:15%">Тех. св-ва</td>
                    <td style = "width:15%">Инд. хар-ки</td>
                    <td style = "width:5%">Ед. </td>
                    <td style = "width:5%">Чистый расход</td>
                    <td style = "width:5%">Объем со склада</td>
                    <td style = "width:5%">Отход, всего</td>
                    <td style = "width:5%">Отход, возвратный</td>
                    <td style = "width:5%">Отход, невозвратный</td>
                    <!--<td style = "width:5%">Неопределенный отход</td>-->
                    <td style = "width:5%" title="Чистый расход + невозвратный отход">Норма расхода</td>
                    <td style = "width:5%">Объем потребности</td>
                    <td style = "width:5%">Кол. шт.</td>
                </tr>
            </thead>
            <%}%>

        </table>
        <div class = 'css-treeview'>
            <ul>
                <% var i = 0;
                        for (var row_index in obj['data'])
                        {
                            i++;
                            var row =obj['data'][row_index];
                            var pp1 = ""; var pp2="";
                            var norm_price = null;
                            var weight_per_unit = null;
                            var unique_props_str = '';
                            var tech_props_str = '';
                            for(var i_pp in row['elem'].properties) {
                                if(row['elem'].properties[i_pp]['origin_id'] == App.SystemObjects['items']['NORM_PRICE'])
                                    norm_price = Routine.strToFloat(row['elem'].properties[i_pp]['value']);

                                if(row['elem'].properties[i_pp]['origin_id'] == App.SystemObjects['items']['WEIGHT_ON_VOLUME'])
                                    weight_per_unit = Routine.strToFloat(row['elem'].properties[i_pp]['value']);

                                if(row['elem'].properties[i_pp]['is_optional'] && !row['elem'].properties[i_pp]['is_techno'])
                                        unique_props_str += row['elem'].properties[i_pp]['name'] + ": " + row['elem'].properties[i_pp]['value'] +  ((row['elem'].properties[i_pp]['unit'] && row['elem'].properties[i_pp]['unit']!='?')?' ' +row['elem'].properties[i_pp]['unit']:'') + '; ';
                                else if (row['elem'].properties[i_pp]['is_techno'])
                                    tech_props_str += row['elem'].properties[i_pp]['name'] + ": " + row['elem'].properties[i_pp]['value'] +  ((row['elem'].properties[i_pp]['unit'] && row['elem'].properties[i_pp]['unit']!='?')?' ' +row['elem'].properties[i_pp]['unit']:'') + '; ';
                            }%>
                <li class = 'h3' data-number = "<%=row['elem']['number']%>" style = 'border-bottom:solid 1px #ccc'>
                    <label class = 'lbl-plus' for="item-<%=i%>">&nbsp;</label>
                    <input type="checkbox" id="item-<%=i%>" />
                    <label class = "lbl-item h3" for="1item-<%=i%>">
                        <table class = "data" style = "background-color">
                            <tbody>
                                <tr class = <%= ((row['elem']['vol_not_defined_waste'])?'error1':'') %>>
                                    <td style = "width:25%"><%=(row['elem']['number'])?row['elem']['number']+'&nbsp;':''%><%= pp1&&App.showShifrs?('<span class="lbl-light">['+pp1+']</span>&nbsp;'):'' %><%=row['elem']['name']%><%= pp2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+pp2+']</span>'):'' %></td>
                                    <td style = "width:15%; font-size:12px; " ><%=tech_props_str%></td>
                                    <td style = "width:15%; font-size:12px; " ><%=unique_props_str%></td>
                                    <td style = "width:5%"><%=(view_in=="money")?'руб.': (view_in=="weight")?'кг': row['elem']['count']['unit']%></td>
                                       <% var chist_rashod = ((Routine.isDiggit(row['elem']['count']['value']))?Routine.addCommas(row['elem']['count']['value'].toFixed(4).toString()," "):row['elem']['count']['value']);
                                            switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(chist_rashod) && norm_price)
                                                    {
                                                        chist_rashod = (Routine.strToFloat(chist_rashod) * norm_price).toFixed(2).toString();
                                                        summ_chist_rashod+=(Routine.strToFloat(chist_rashod) );
                                                    }
                                                    else
                                                        chist_rashod = '-';''
                                                break;
                                                case 'weight':
                                                    if(Routine.isDiggit(chist_rashod) && weight_per_unit)
                                                    {
                                                        chist_rashod = (Routine.strToFloat(chist_rashod) * weight_per_unit).toFixed(2).toString();
                                                        summ_chist_rashod+=(Routine.strToFloat(chist_rashod) );
                                                    }
                                                    else
                                                        chist_rashod = '-';''
                                                break;
                                            }%>
                                    <td style = "width:5%"><%=Routine.addCommas(chist_rashod," ")%></td>
                                    <% var count_from_stock = ((row['elem']['count_from_stock']['value'])?((Routine.isDiggit(row['elem']['count_from_stock']['value']))?Routine.addCommas(row['elem']['count_from_stock']['value'].toFixed(4).toString()," "):row['elem']['count_from_stock']['value']):'-');
                                            switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(count_from_stock) && norm_price)
                                                    {
                                                        count_from_stock = (Routine.strToFloat(count_from_stock) * norm_price).toFixed(2).toString();
                                                        summ_count_from_stock+=(Routine.strToFloat(count_from_stock));
                                                    }
                                                    else
                                                        count_from_stock = '-';''
                                                break;
                                                case 'weight':
                                                    if(Routine.isDiggit(count_from_stock) && weight_per_unit)
                                                    {
                                                        count_from_stock = (Routine.strToFloat(count_from_stock) * weight_per_unit).toFixed(2).toString();
                                                        summ_count_from_stock+=(Routine.strToFloat(count_from_stock));
                                                    }
                                                    else
                                                        count_from_stock = '-';''
                                                break;
                                            }%>
                                    <td class = "in-object-from-stock" style = "width:5%"><%=Routine.addCommas(count_from_stock," ")%></td>

                                      <% var vol_full_waste = ((row['elem']['vol_full_waste'])?((Routine.isDiggit(row['elem']['vol_full_waste']))?Routine.addCommas((row['elem']['vol_full_waste']).toFixed(4).toString()," "):row['elem']['vol_full_waste']):'-');
                                            switch(view_in){
                                                case 'money':
                                                        if(Routine.isDiggit(vol_full_waste) && norm_price)
                                                        {
                                                            vol_full_waste = (Routine.strToFloat(vol_full_waste) * norm_price).toFixed(2).toString();
                                                            summ_vol_full_waste+=(Routine.strToFloat(vol_full_waste) );
                                                        }
                                                        else
                                                            vol_full_waste = '-';''
                                                break;
                                                case 'weight':
                                                      if(Routine.isDiggit(vol_full_waste) && weight_per_unit)
                                                        {
                                                            vol_full_waste = (Routine.strToFloat(vol_full_waste) * weight_per_unit).toFixed(2).toString();
                                                            summ_vol_full_waste+=(Routine.strToFloat(vol_full_waste) );
                                                        }
                                                        else
                                                            vol_full_waste = '-';''
                                                break;
                                            }%>
                                    <td class = "in-object-full-wate" style = "width:5%"><%=Routine.addCommas(vol_full_waste," ")%></td>

                                    <% var vol_returned_waste = ((row['elem']['vol_returned_waste'])?((Routine.isDiggit(row['elem']['vol_returned_waste']))?Routine.addCommas((row['elem']['vol_returned_waste']).toFixed(4).toString()," "):row['elem']['vol_returned_waste']):'по заданию');
                                            switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(vol_returned_waste) && norm_price)
                                                    {
                                                        vol_returned_waste = (Routine.strToFloat(vol_returned_waste) * norm_price).toFixed(2).toString();
                                                        summ_vol_returned_waste+=(Routine.strToFloat(vol_returned_waste) );
                                                    }
                                                    else
                                                        vol_returned_waste = '-';''
                                                break;
                                                case 'weight':
                                                        if(Routine.isDiggit(vol_returned_waste) && weight_per_unit)
                                                        {
                                                            vol_returned_waste = (Routine.strToFloat(vol_returned_waste) * weight_per_unit).toFixed(2).toString();
                                                            summ_vol_returned_waste+=(Routine.strToFloat(vol_returned_waste) );
                                                        }
                                                        else
                                                            vol_returned_waste = '-';''
                                                break;
                                            }%>
                                    <td class = "in-object-returned-wate" style = "width:5%"><%=Routine.addCommas(vol_returned_waste," ")%></td>

                                    <% var vol_not_returned_waste = ((row['elem']['vol_not_returned_waste'])?((Routine.isDiggit(row['elem']['vol_not_returned_waste']))?Routine.addCommas((row['elem']['vol_not_returned_waste']).toFixed(4).toString()," "):row['elem']['vol_not_returned_waste']):'-');

                                             switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(vol_not_returned_waste) && norm_price)
                                                    {
                                                        vol_not_returned_waste = (Routine.strToFloat(vol_not_returned_waste) * norm_price).toFixed(2).toString();
                                                        summ_vol_not_returned_waste+=(Routine.strToFloat(vol_not_returned_waste));
                                                    }
                                                    else
                                                        vol_not_returned_waste = '-';''
                                                break;
                                                case 'weight':
                                                    if(Routine.isDiggit(vol_not_returned_waste) && weight_per_unit)
                                                    {
                                                        vol_not_returned_waste = (Routine.strToFloat(vol_not_returned_waste) * weight_per_unit).toFixed(2).toString();
                                                        summ_vol_not_returned_waste+=(Routine.strToFloat(vol_not_returned_waste));
                                                    }
                                                    else
                                                        vol_not_returned_waste = '-';''
                                                break;

                                            }%>
                                    <td class = "in-object-not-returned-wate" style = "width:5%"><%=Routine.addCommas(vol_not_returned_waste," ")%></td>
                                    <% var norma_rashoda = ((row['elem']['count']['value'])?((Routine.isDiggit(row['elem']['count']['value']))?Routine.addCommas((row['elem']['count']['value']+ Routine.strToFloat(row['elem']['vol_not_returned_waste']) ).toFixed(4).toString()," "):row['elem']['count']['value']):'-');

                                            switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(norma_rashoda) && norm_price)
                                                    {
                                                        norma_rashoda = (Routine.strToFloat(norma_rashoda) * norm_price).toFixed(2).toString();
                                                        summ_norma_rashoda+=(Routine.strToFloat(norma_rashoda) );
                                                    }
                                                    else
                                                        norma_rashoda = '-';''
                                                break;
                                                case 'weight':
                                                    if(Routine.isDiggit(norma_rashoda) && weight_per_unit)
                                                    {
                                                        norma_rashoda = (Routine.strToFloat(norma_rashoda) * weight_per_unit).toFixed(2).toString();
                                                        summ_norma_rashoda+=(Routine.strToFloat(norma_rashoda) );
                                                    }
                                                    else
                                                        norma_rashoda = '-';''
                                                break;

                                            }%>
                                    <td class = "in-object-for-buy" style = "width:5%"><%=Routine.addCommas(norma_rashoda," ")%></td>

                                    <% var obiem_potrebnosty = ((row['elem']['vol_full'])?((Routine.isDiggit(row['elem']['vol_full']))?Routine.addCommas((row['elem']['vol_full']- row['elem']['count_from_stock']['value']).toFixed(4).toString()," "):row['elem']['vol_full']):'-');
                                            switch(view_in){
                                                case 'money':
                                                    if(Routine.isDiggit(obiem_potrebnosty) && norm_price)
                                                    {
                                                        obiem_potrebnosty = (Routine.strToFloat(obiem_potrebnosty) * norm_price).toFixed(2).toString();
                                                        summ_obiem_potrebnosty+=(Routine.strToFloat(obiem_potrebnosty) );
                                                    }
                                                    else
                                                        obiem_potrebnosty = '-';''
                                                break;
                                                case 'weight':
                                                    if(Routine.isDiggit(obiem_potrebnosty) && weight_per_unit)
                                                    {
                                                        obiem_potrebnosty = (Routine.strToFloat(obiem_potrebnosty) * weight_per_unit).toFixed(2).toString();
                                                        summ_obiem_potrebnosty+=(Routine.strToFloat(obiem_potrebnosty) );
                                                    }
                                                    else
                                                        obiem_potrebnosty = '-';''
                                                break;
                                            }%>
                                    <td class = "in-object-for-buy" style = "width:5%"><%=Routine.addCommas(obiem_potrebnosty," ")%></td>
                                    <td class = "in-object-count" style = "width:5%"><%=(row['elem']['vol_amount'])?((Routine.isDiggit(row['elem']['vol_amount']))?Routine.addCommas(row['elem']['vol_amount'].toFixed(4).toString()," "):row['elem']['vol_amount']):'-'%></td>
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
                                        <td>Тех. св-ва</td>
                                        <td>Инд. хар-ки</td>
                                        <td>Треб.</td>
                                        <td>Со склада</td>
                                        <td>В произв.</td>
                                        <td>Ед. изм.</td>
                                    </tr>
                                </thead>
                                <tbody>
                                <%var j=0;
                                for (var row_to_produce_index in row['items'])
                                    {
                                        j++;
                                        var row_to_produce = row['items'][row_to_produce_index];
                                        var p1 = "";
                                        var p2="";
                                        var unique_props_str = "";
                                        var tech_props_str = "";
                                        for(var i_p in row_to_produce.properties) {
                                                if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                      p1 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                    p2 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p]['is_optional'] && !row_to_produce.properties[i_p]['is_techno'])
                                                        unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                                else if(row_to_produce.properties[i_p]['is_techno'])
                                                        tech_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                        }%>
                                    <tr data-number = "<%=row_to_produce['number']%>" data-config-number = "<%=row_to_produce['config_number']%>">
                                        <td style = "width:30%"><%=(row_to_produce['number'])?row_to_produce['number']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                        <td style = "width:15%"><%=tech_props_str%></td>
                                        <td style = "width:15%"><%=unique_props_str%></td>
                                        <!--всего требуется-->
                                        <td style = "width:10%"><%=(Routine.isDiggit(row_to_produce['count']['value']))?Routine.addCommas(row_to_produce['count']['value'].toFixed(4).toString()," "):row_to_produce['count']['value']%></td>
                                        <!--объем со склада-->
                                        <td style = "width:10%"><%= ((row_to_produce['count_from_stock'])?(Routine.isDiggit(row_to_produce['count_from_stock']['value']))?Routine.addCommas(row_to_produce['count_from_stock']['value'].toFixed(4).toString()," "):row_to_produce['count_from_stock']['value']: '')%></td>
                                        <!--объем на производство-->
                                        <td style = "width:13%"><%=((row_to_produce['count_to_produce'])?(Routine.isDiggit(row_to_produce['count_to_produce']['value']))?Routine.addCommas(row_to_produce['count_to_produce']['value'].toFixed(4).toString()," "):row_to_produce['count_to_produce']['value']:'')%></td>
                                        <!--единицы измерения-->
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
                        <% if (true || !('templates_combs' in row)){%>
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
                                        <td style = "width:30%">Изделие</td>
                                        <td style = "width:15%">Тех. св-ва</td>
                                        <td style = "width:15%">Инд. хар-ки</td>
                                        <td style = "width:10%">Чистый расход</td>
                                        <td style = "width:10%">Объем потребности</td>
                                        <td style = "width:10%">Кол. шт.</td>
                                    </tr>
                                </thead>
                                 <tbody>
                                <%var j=0;
                                for (var row_to_produce_index in row['items'])
                                {
                                        j++;
                                        var row_to_produce = row['items'][row_to_produce_index];
                                        var p1 = ""; var p2=""; var unique_props_str = "";
                                        var tech_props_str = "";
                                        for(var i_p in row_to_produce.properties) {
                                                if(row_to_produce.properties[i_p].datalink && row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                                                      p1 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p].datalink || row_to_produce.properties[i_p].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                                                    p2 = row_to_produce.properties[i_p].value
                                                }
                                                if(row_to_produce.properties[i_p]['is_optional'] && !row_to_produce.properties[i_p]['is_techno'])
                                                        unique_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                                else if(row_to_produce.properties[i_p]['is_techno'])
                                                        tech_props_str += row_to_produce.properties[i_p]['name'] + ": " + row_to_produce.properties[i_p]['value'] +  ((row_to_produce.properties[i_p]['unit'] && row_to_produce.properties[i_p]['unit']!='?')?' ' +row_to_produce.properties[i_p]['unit']:'') + '; ';
                                        }%>
                                    <tr data-number = "<%=row_to_produce['number']%>" data-config-number = "<%=row_to_produce['config_number']%>">
                                        <td style = "width:30%"><%=(row_to_produce['number'])?row_to_produce['number']+'&nbsp;':''%><%= p1?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=row_to_produce['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></td>
                                        <td style = "width:15%"><%=tech_props_str%></td>
                                        <td style = "width:15%"><%=unique_props_str%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_bynorm'])?((Routine.isDiggit(row_to_produce['vol_bynorm']))?Routine.addCommas(row_to_produce['vol_bynorm'].toFixed(4).toString()," "):row_to_produce['vol_bynorm']):'-'%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_full'])?((Routine.isDiggit(row_to_produce['vol_full']))?Routine.addCommas(row_to_produce['vol_full'].toFixed(4).toString()," "):row_to_produce['vol_full']):'-'%></td>
                                        <td style = "width:10%"><%=(row_to_produce['vol_amount'])?((Routine.isDiggit(row_to_produce['vol_amount']))?Routine.addCommas(row_to_produce['vol_amount'].toFixed(4).toString()," "):row_to_produce['vol_amount']):'-'%></td>
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
                        if(!row['templates_combs']){%>
                            <li class = 'h3'>
                                <ul>
                                    <li class = 'lbl-info'><span class = "color-red">Ошибка! Нет подходящих вариантов раскроя.</span></li>
                                </ul>
                            </li>
                        <%}
                        else
                        {%>
                            <li class = 'h3'>
                                <label class = 'lbl-plus' for="item-<%=i%>-2">&nbsp;</label>
                                <input type="checkbox" id="item-<%=i%>-2" />
                                <label class = "lbl-item h3" for="1item-<%=i%>-2">
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
                                <%var row_comb = row['templates_combs']%>
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
                        <%}%><!--end if-->
                        <%}%><!--end if-->
                        <!--Конец блока вывода списка конфигураций шаблонов-->
                    </ul>
                </li>
                <%}%>
            </ul>
        </div>
          <%if (view_in=="money" || view_in=="weight"){%>
            <table class = "data">
            <thead>
                <tr>
                    <td style = "width:25%">&nbsp;</td>
                    <td style = "width:15%">&nbsp;</td>
                    <td style = "width:15%">&nbsp;</td>
                    <td style = "width:5%">&nbsp;</td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_chist_rashod.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_count_from_stock.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_vol_full_waste.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_vol_returned_waste.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_vol_not_returned_waste.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%" title="Чистый расход + невозвратный отход"><%=Routine.addCommas(summ_norma_rashoda.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%"><%=Routine.addCommas(summ_obiem_potrebnosty.toFixed(2).toString()," ")%></td>
                    <td style = "width:5%">&nbsp;</td>
                </tr>
            </thead>
            </table>
            <%}%>
    <%}%>
</script>
