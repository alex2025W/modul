<!--УЧАСТОК-->
<script id="sectorItemTemplate" type="text/template">
  <label class = 'lbl-plus' for="own-item-<%=i%>" style = "<%=(is_full_order)?'display:none!important':''%>" >&nbsp;</label>
  <input type="checkbox" id="own-item-<%=i%>" class = "sector-cb-item cb-item" <%=(is_full_order)?'checked':''%>  />
  <label class = "lbl-item h1 <%=is_full_order?'hide_before':''%>" for="1item-<%=i%>">
    <table class = "data">
      <tbody>
        <tr>
          <td  class = "font16"><%=name%></td>
          <td style = "text-align:right;">
            <div class="input-prepend input-append controls" style = "margin: 5px 40px 0px 0px; display:none;">
              <span class="add-on" title = "Загрузить из задания"><b class="fa fa-cloud-upload"></b></span>
              <input type="text" class="tb-task-number"  placeholder="номер задания" value = "" style = "width:130px;" title = "Загрузить из задания" />
              <input type="button" class = "btn btn-success load-task-data" value = "Открыть" title = "загрузить из задания" />
            </div>
          </td>
        </tr>
        <tr class = "pnl-specification-filter" style = "display:none">
          <td colspan = "2" class = "pnl-specification-filter-body" style = "text-align:right;">

            <div style = "float: left">
              <!-- Блок можно изготовить -->
              <div class = "pnl-owner-specification-body-container">
                <fieldset class="collapsible collapsed" >
                  <legend style="text-align: left;  font-size: 14px; line-height: initial;"><b>Заказные изделия</b><br><span class = "legend-m">На данный момент изготовленные на участке ДСЕ можно применить для производство следующих заказных изделий (через "ИЛИ")</span></legend>
                  <div style = "display: none">
                  <table class = "data" >
                    <tbody></tbody>
                  </table>
                  </div>
                </fieldset>
              </div>
              <!-- Блок примененные шаблоны раскроя -->
              <div class = "pnl-used-templates-body-container">
                <fieldset class="collapsible collapsed" style = "float:left; width:100%">
                  <legend ><b>Примененные шаблоны раскроя</b><br><span class = "legend-m">Список примененных шаблонов раскроя на данном участке</span></legend>
                  <div style = "display: none">
                     <div class = 'css-treeview'>
                        <table class = 'data' style = "width:100%">
                          <thead>
                            <tr>
                              <td style = "width:70%">Шаблон</td>
                              <td style = "width:10%">План</td>
                              <td style = "width:10%">Факт</td>
                              <!--<td style = "width:10%">Исп.</td>-->
                              <td  style = "width:10%">Расчет</td>
                            </tr>
                          </thead>
                        </table>
                        <ul class = "templates-list"></ul>
                     </div>
                     <div class="pnl-sector-templates-controls">
                      <!-- Элекменты управления в режиме редактирования-->
                      <div class = "edit-state" style="display:none">
                        <label style = "float:left; ">
                          <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-hide-empty-templates"> &nbsp;&nbsp;Скрыть пустые
                        </label>
                        <input type="button" style="margin-left:5px;" class="btn btn-cancel-templates" value="Отмена" title="Отменить все действия  и вернуться в режим просмотра">
                        <input type="button" style="margin-left:5px;" class="btn btn-clear-templates" value="Очистить" title="Очистить выбранные шаблоны">
                        <input type="button" class="btn btn-calculate-by-templates" value="Рассчитать" title="Произвести расчет по выбранным шаблонам">
                      </div>
                      <!-- Элекменты управления в режиме просмотра-->
                      <div class = "view-state">
                        <label style = "float:left; ">
                          <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-hide-empty-templates"> &nbsp;&nbsp;Скрыть пустые
                        </label>
                        <input type="button" class="btn btn-start-planing-by-templates" value="Начать планирование" title="Начать планирование сменных заданий по шаблонам раскроя">
                      </div>
                    </div>
                  </div>
                </fieldset>
              </div>
            </div>

            <!--Расчет по укрупненному изделию-->
            <fieldset class="collapsible">
              <legend>Расчет по укрупненному изделию</legend>
              <div class = "pnl-specification-filter-body-container">
                <div class = "pnl-specification-filter-list"></div>
                <div class = "pnl-specification-filter-controls">
                   <input type="button" class = "btn btn-add-specifications" value = "Добавить" title = "Добавить спецификацию" />
                  <input type="button" style = "margin-left:5px;" class = "btn btn-calculate-by-specifications" value = "Рассчитать" title = "Произвести расчет по объемам указанных спецификаций" />
                  <input type="button" style = "margin-left:5px;" class = "btn btn-cancel-filter" value = "Очистить" title = "Очистить фильтры" />
                </div>
              </div>
            </fieldset>
          </td>
        </tr>
        <!---->
      </tbody>
    </table>
  </label>

  <ul class = "data-list" style = "padding-bottom:30px">
    <div style = "float:left; ">
      <div style="float:left; margin-right:30px;">
        <label style = "float:left; margin:4px 4px 0px 0px">Сортировать по:</label>
        <select class="ddl-sort-by">
          <option value="deep">Укрупнённости</option>
          <option value="weight_per_unit">Весу</option>
          <option value="name">Алфавиту</option>
        </select>
      </div>
      <label style = "float:left; margin-top: 4px;">
        <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-show-tasks"> &nbsp;&nbsp;Показать задания
      </label>
    </div>
    <div>
      <table class = 'in-info'>
        <thead>
          <tr style = "background-color: whitesmoke;">
            <td colspan = "6" class = "black-border" ></td>
            <td >Заказано</td>
            <td class = "black-border task-number-col"></td>
            <td class = "task-number-col" >Выдано</td>
            <td class = "black-border">Осталось выдать </td>
            <td class = "task-number-col" >Сдано</td>
            <td   title = "Израсходовано">Изр.</td>
            <td  title = "Свободно" class = "black-border">Своб.</td>
            <td colspan = "3"></td>
          </tr>
          <tr>
            <td style = "width:2%">№</td>
            <td style = "width:5%">Артикул</td>
            <td style = "width:15%">Название</td>
            <td style = "width:5%">Норм. времени на 1 изд.</td>
            <td style = "width:7%" >Входит в </td>
            <td style = "width:7%" class = "black-border">Получатель</td>
            <td style = "width:3%">Всего, шт.</td>
            <td style = "width:7%" class = "black-border task-number-col">Кол-во / № задания</td>
            <!--Выдано-->
            <td class = "task-number-col" style = "width:7%" >Кол-во / № задания</td>
            <td style = "width:4%" class = "black-border">шт.</td><!--Осталось выдать -->
            <!--Сдано-->
            <td class = "task-number-col" style = "width:7%">Кол-во / № задания</td>
            <!--Не сдано-->
            <!--<td style = "width:3%" class = "black-border">шт.</td>-->
            <!--Израсходовано-->
            <td style = "width:4%">шт.</td>
            <!--Свободно-->
            <td style = "width:4%" class = "black-border">шт.</td>
            <!--Осталось сдать -->
            <td style = "width:4%">Осталось сдать </td>
            <td style = "width:4%">
              Количество
              <a style = "margin-left: 5px;"class = "icon-link all-use-product-struct"  title = "Учитывать структуру изделия"><i class="fa fa-sitemap"></i></a>
              <a style = "margin-left: 5px;"class = "icon-link all-use-templates"  title = "Учитывать шаблоны раскроя"><i class="fa fa-scissors"></i></a>
            </td>
            <td style = "width:4%">Время, чч:мм</td>
          </tr>
        </thead>
        <tbody class = "spec-data-list"></tbody>
      </table>
    </div>
    <div style="margin:20px 10px 20px 0px; text-align:right; padding-top:10px;padding-bottom:10px; ">
      <div style = "float:right;">
        <div style = "float:left">
          <label style = "float:left; margin-right:20px;">
            <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-hide-empty"> &nbsp;&nbsp;Скрыть пустые
          </label>
          <span class="lnk-local lnk-clear-volumes" style = "float:left; margin-right:20px;">Очистить количество</a>
        </div>
      </div>
    </div>
    <div style="margin:20px 10px 10px 0px; text-align:right; padding-top:10px; border-top:dashed 1px #ccc; height:360px;">
      <div style = "float:right;">
        <div style = "float:left">
          <div class="date-picker" style = "margin-right:30px; text-align:right;"></div>

           <div class="input-append controls" style = "margin: 5px 40px 0px 0px">
            <textarea  class="span5 tbNote" cols="20" rows="3"></textarea>
            <br/>
            <input type="button" style = "margin-right:10px;" class = "btn btn-success save-data" value = "Сохранить"  />
            <input type="button" class = "btn cancel-data" value = "Отмена"  />
          </div>
        </div>
      </div>
     </div>
  </ul>
</script>

<!--СПЕЦИФИКАЦИЯ-->
<script id="specificationItemTemplate" type="text/template">
  <%var production_orders_str = "";
  var production_orders_arr = [];  // список номеров заданй на производство, в которых участвует текущий элемент
  var issued_shift_tasks_arr = [];  // список сменных заданий с оприходованным объемом по каждому
  var handed_shift_tasks_arr = []; //список сменных заданий с фактическим объемом по каждому
  for(var row in production_orders)
  {
    //if(production_orders[row]>0)
      production_orders_arr.push({'number':row, 'count': production_orders[row]});
  }
  for(var row in issued_shift_tasks)
      issued_shift_tasks_arr.push({'number':row, 'count': issued_shift_tasks[row]['count'], 'date': issued_shift_tasks[row]['date'] });
  for(var row in handed_shift_tasks)
      handed_shift_tasks_arr.push({'number':row, 'count': handed_shift_tasks[row]['count'], 'date': handed_shift_tasks[row]['date'], 'task_date': handed_shift_tasks[row]['task_date']});%>
  <td><%=j+1%></td>
  <td><a class = "lnk" href= "/esud/specification#number/<%=number%>/tab/2/optional/false" target = "_blank"><%=number%></a></td>
  <td><%=name%> </td>
  <td><%=(plan_execution_time['value'])?(Routine.addCommas(Math.round(Routine.secondsToMinutes(plan_execution_time['value'])).toFixed(2).toString()," ")+' мин'): '' %></td>
  <!-- Участок отправитель-->
  <!--<td ><%=(sector)?sector['name']:'' %></td>-->
  <!--входит в -->
  <td >
    <% var lbl_parents = [];
      if(parents && parents.length>0)
        for(var i in parents)
          lbl_parents.push(parents[i]['number'] + ' ' + parents[i]['name'])%>
    <%=lbl_parents.join('; ')%>
  </td>
  <!-- Участок получатель-->
  <td class = "black-border"><%=(parent_sector)?parent_sector['name']:'' %></td>
  <!--Заказано-->
  <td class = "font18"><%=count['value']%></td>
  <td class = "black-border task-number-col">
    <%for(var i =0; i<production_orders_arr.length; i++){%>
       <span class = "lbl-grey-item "><%= production_orders_arr[i]['count'] +' / '+ production_orders_arr[i]['number']%></span>
    <%}%>
  </td>
  <!--Выдано-->
  <!--<td><%=count['issued']%>&nbsp;из&nbsp;<%=count['value']%></td>-->
  <td class = "task-number-col">
    <%for(var i =0; i<issued_shift_tasks_arr.length; i++){%>
       <span class = "lbl-grey-item" ><%=issued_shift_tasks_arr[i]['count'] +' / ' %><a href = "/shift_task/facts#<%=moment(issued_shift_tasks_arr[i]['date'], 'YYYY-MM-DD').format('DD_MM_YYYY')%>" title = "<%=moment(issued_shift_tasks_arr[i]['date'], 'YYYY-MM-DD').format('DD/MM/YYYY')%>" class = "lnk"><%=issued_shift_tasks_arr[i]['number']%></a></span>
    <%}%>
  </td>
  <!--<td class = "black-border"><%=count['value'] - count['issued']%></td>--> <!--не выдано-->
  <td class = "black-border font18"><%=((count['value'] - count['real_issued'])>0)?count['value'] - count['real_issued']:0%> <!--Осталось выдать -->
  <!--Сдано-->
  <!--<td class= "font18"><%=count['handed']%>&nbsp;из&nbsp;<%=count['issued']%></td>-->
  <td class = "task-number-col">
    <%for(var i =0; i<handed_shift_tasks_arr.length; i++){%>
      <span class = "lbl-grey-item" ><%=handed_shift_tasks_arr[i]['count'] +' / ' %><a href = "/shift_task/facts#<%=moment(handed_shift_tasks_arr[i]['task_date'], 'YYYY-MM-DD').format('DD_MM_YYYY')%>" title = "<%=moment(handed_shift_tasks_arr[i]['task_date'], 'YYYY-MM-DD').format('DD/MM/YYYY')%>" class = "lnk"><%=handed_shift_tasks_arr[i]['number']%></a></span>
    <%}%>
  </td>
  <!--Не сдано-->
  <!--<td class = "black-border font18"><%=count['issued'] - count['handed']%></td>-->
  <!--Израсходовано-->
  <% var used_detail="";
  for(var i in count['used_detail']){
    //used_detail+=count['used_detail'][i].toString()+ "->" + i + "; ";
  }%>
  <td title = "<%=used_detail%>"><%=count['used']%></td>
  <!--Свободно-->
  <td class = "black-border"><%=count['handed'] - count['used']%></td>

  <!--Осталось сдать -->
  <td class = "font18"><%=count['balance']%></td>
  <td>
    <div class = "tb-fact-box">
      <input type="text" class="tb tb-fact"  placeholder="0" value = "<%=volume%>"  />
      <a style = "margin-left: 5px;" class = "icon-link use-product-struct <%= obj.use_product_struct?'':'not_active' %>"  title = "Учитывать структуру изделия"><i class="fa fa-sitemap"></i></a>
      <%if(obj.need_templates){%>
      <a style = "margin-left: 5px;" class = "icon-link use-templates <%= obj.use_templates?'':'not_active' %>"  title = "Учитывать шаблоны раскроя"><i class="fa fa-scissors"></i></a>
      <%}%>
    </div>
  </td>
  <td>
    <%=(time)?Routine.hhmmss(time): '-' %>
  </td>
</script>
<!--ITOGO ITEM TEMPLATE-->
<script id="specificationItogoTemplate" type="text/template">
  <tr class = "tr-footer">
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td></td>
    <td class = "black-border"></td>
    <!--Заказано-->
    <td><b><%=Routine.addCommas(value, " ")%></b></td>
    <td class = "black-border task-number-col"></td>
    <!--Выдано-->
    <!--<td><b><%=Routine.addCommas(issued, " ")%></b></td>-->
    <td class = "task-number-col"></td>
    <!--<td class = "black-border"><b><%=Routine.addCommas(value - issued, " ")%></b></td>--> <!--не выдано-->
    <td class = "black-border"><b><%=Routine.addCommas( ((real_issued)>0)?real_issued:0, " ")%></b></td> <!--Осталось выдать -->
    <!--Сдано-->
    <!--<td><b><%=Routine.addCommas(handed, " ")%></b></td>-->
    <td class = "task-number-col"></td>
    <!-- Не сдано-->
    <!--<td class = "black-border"><b><%=Routine.addCommas(issued - handed, " ")%></b></td>-->

    <!-- израсходовано-->
    <td><b><%=Routine.addCommas(used, " ")%></b></td>
    <!--Свободно-->
    <td class = "black-border"><b><%=Routine.addCommas(handed - used, " ")%></b></td>

    <!--Осталось сдать -->
    <td><b><%=Routine.addCommas(balance, " ")%></b></td>
    <td><b><%=Routine.addCommas(fact, " ")%></b></td>
    <td><b><%=(time)?Routine.hhmmss(time): '-' %></b></td>
  </tr>
</script>




<!--ЭЛЕМЕНТ ФИЛЬТРА ПО НОМЕРУ ЗАКАЗА-->
<script id="filterItemTemplateOrder" type="text/template">
  <option value = "<%=number%>" <%=(selected)?'selected':'' %> ><%= number%></option>
</script>

<!--ЭЛЕМЕНТ ФИЛЬТРАЦИИ ПО СПЕЦИФИКАЦИИ-->
<script id="filterItemTemplateSpecificationPlus" type="text/template">
  <span class="add-on lbl-specification-info" style = "<%=((label)?'':'display:none')%>"><%=label%></span>
  <span class="add-on" title = "Добавить спецификацию в расчеты"><b class="fa fa-file-text-o"></b></span>
  <input type="text" class="tb-specification-number"  placeholder="артикул спецификации" value = "<%=number%>" style = "width:170px;" title = "Артикул спецификации" />
  <input type="text" class="tb-specification-volume"  placeholder="количество" value = "<%=count%>" style = "width:100px;" title = "Требуемое количество" />
  <button style = "display:none" class = "btn btn-action btn-add" title = "Добавить еще спецификацию" ><i class="fa fa-plus-circle"></i></button>
</script>
<script id="filterItemTemplateSpecificationMinus" type="text/template">
  <span class="add-on lbl-specification-info" style = "<%=((label)?'':'display:none')%>"><%=label%></span>
  <span class="add-on" title = "Добавить спецификацию в расчеты"><b class="fa fa-file-text-o"></b></span>
  <input type="text" class="tb-specification-number"  placeholder="артикул спецификации" value = "<%=number%>" style = "width:170px;" title = "Артикул спецификации" />
  <input type="text" class="tb-specification-volume"  placeholder="количество" value = "<%=count%>" style = "width:100px;" title = "Требуемое количество" />
  <button class = "btn btn-action btn-remove" title = "Удалить спецификацию из списка" ><i class="fa fa-minus-circle"></i></button>
</script>

<!--fШАБЛОН ЭЛЕМЕНТ ИНФОРМАЦИИ О КОНЕЧНОМ ИЗДЕЛИИ-СПЕЦИФИКАЦИИ-->
<script id="ownerItemTemplateSpecification" type="text/template">
  <td><a class = "lnk" href= "/esud/specification#number/<%=number%>/tab/2/optional/false" target = "_blank"><%=number%></a>&nbsp;<%=name%></td>
  <td><%=completed.toString()%>&nbsp;из&nbsp;<%=count['value'].toString()%>&nbsp;<%=count['unit']%></td>
  <td ><a style = "margin-left: 5px; color: #666"class = "icon-link lnk-add-item-to-calculate"  title = "Добавить позицию в расчет по укрупненному изделию"><i class="fa fa-calculator"></i></a></td>
</script>

<!--ШАБЛОН ФОРМЫ - МОЖНО ИЗГОТОВИТЬ-->
<script id="canMakeTemplate" type="text/template">
  <div class = "pnl-specification-filter">
    <fieldset class="collapsible">
      <legend>Можно изготовить</legend>
      <div class = "pnl-specification-filter-body-container">
        <div class = "pnl-specification-filter-list"></div>
        <div class = "pnl-specification-filter-controls">
           <input type="button" class = "btn btn-add-specifications" value = "Добавить" title = "Добавить спецификацию" />
          <input type="button" style = "margin-left:5px;" class = "btn btn-calculate-by-specifications" value = "Рассчитать" title = "Произвести расчет" />
          <input type="button" style = "margin-left:5px;" class = "btn btn-cancel-filter" value = "Очистить" title = "Очистить фильтры" />
        </div>
      </div>
    </fieldset>
  </div>
  <div class = "data-body">
  </div>
</script>

<!--ШАБЛОН детализации спецификации блока - МОЖНО ИЗГОТОВИТЬ-->
<script id="canMakeItemDetalizationTemplate" type="text/template">
  <div class = "item-detalization">
    <div class = "header">
      <span><b><a class = "lnk" href= "/esud/specification#number/<%=number%>/tab/2/optional/false" target = "_blank"><%=number%></a></b></span>;&nbsp;
      <span>Запрошено: <%=need_count%></span>;&nbsp;
      <span>Можно изготовить: <%=can_make_count%></span>
    </div>
    <table class = 'data'>
          <thead>
            <tr >
              <td style = "width:5%">№</td>
              <td style = "width:10%">Артикул</td>
              <td style = "width:55%">Название</td>
              <td style = "width:10%">Требуется всего</td>
              <td style = "width:10%">В наличии</td>
              <td style = "width:10%">Не хватает</td>
            </tr>
          </thead>
          <tbody class = "spec-data-list">
            <% for(var i in items){
                  var item = items[i];%>
                  <tr>
                    <td><%=parseInt(i)+1%></td>
                    <td><a class = "lnk" href= "/esud/specification#number/<%=item['number']%>/tab/2/optional/false" target = "_blank"><%=item['number']%></a></td>
                    <td><%=item['name']%></td>
                    <td><%=item['need_count']%></td>
                    <td><%=item['ready_count']%></td>
                    <td class = "<%=(item['ready_count']<item['need_count'])?'error':''%>"><%=(item['ready_count']<item['need_count'])?item['need_count']-item['ready_count']:''%></td>
                  </tr>
            <%}%>
          </tbody>
    </table>
  </div>
</script>

<!--ШАБЛОН панели с двумя блоками - Заказные изделия + Расчет по укрупненным изделиям. Данный блок не содержит информации о спецификациях, читос для укрупненных расчетов -->
<script id="pnlCalcByOwnerSpecifications" type="text/template">
  <div class = "line pnl-specification-filter pnl-global-calc-by-owner-specifications" style = "text-align:right">
      <!-- Блок можно изготовить -->
      <div style = "float: left">
        <div class = "pnl-owner-specification-body-container">
          <fieldset class="collapsible collapsed">
            <legend style="text-align: left;  font-size: 14px; line-height: initial;">
              <b>Заказные изделия</b><br>
              <span class = "legend-m">На данный момент изготовленные ДСЕ можно применить для производство следующих заказных изделий (через "ИЛИ")</span></legend>
              <div style = "display: none">
                <table class = "data" >
                  <tbody></tbody>
                </table>
              </div>
          </fieldset>
        </div>
        <!-- Блок примененные шаблоны раскроя -->
        <div class = "pnl-used-templates-body-container">
          <fieldset class="collapsible collapsed" style = "float:left; width:100%;">
            <legend ><b>Примененные шаблоны раскроя</b><br><span class = "legend-m">Список примененных шаблонов раскроя на всех участках</span></legend>
            <div style = "display: none">
               <div class = 'css-treeview'>
                <ul class = "templates-list"></ul>
               </div>
                 <div class="pnl-sector-templates-controls">
                  <!-- Элекменты управления в режиме редактирования-->
                  <div class = "edit-state" style="display:none">
                    <label style = "float:left; ">
                      <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-hide-empty-templates"> &nbsp;&nbsp;Скрыть пустые
                    </label>
                    <input type="button" style="margin-left:5px;" class="btn btn-cancel-templates" value="Отмена" title="Отменить все действия  и вернуться в режим просмотра">
                    <input type="button" style="margin-left:5px;" class="btn btn-clear-templates" value="Очистить" title="Очистить выбранные шаблоны">
                    <input type="button" class="btn btn-calculate-by-templates" value="Рассчитать" title="Произвести расчет по выбранным шаблонам">
                  </div>
                  <!-- Элекменты управления в режиме просмотра-->
                  <div class = "view-state">
                    <label style = "float:left; ">
                      <input type="checkbox" style = "float:left; position: initial; opacity: initial; display: initial;"  class = "cb-hide-empty-templates"> &nbsp;&nbsp;Скрыть пустые
                    </label>
                    <input type="button" class="btn btn-start-planing-by-templates" value="Начать планирование" title="Начать планирование сменных заданий по шаблонам раскроя">
                  </div>
                </div>
            </div>
          </fieldset>
        </div>
      </div>
      <!--Расчет по укрупненному изделию-->
      <fieldset class="collapsible">
        <legend>Расчет по укрупненному изделию</legend>
        <div class = "pnl-specification-filter-body-container">
          <div class = "pnl-specification-filter-list"></div>
          <div class = "pnl-specification-filter-controls">
             <input type="button" class = "btn btn-add-specifications" value = "Добавить" title = "Добавить спецификацию" />
            <input type="button" style = "margin-left:5px;" class = "btn btn-calculate-by-specifications" value = "Рассчитать" title = "Произвести расчет по объемам указанных спецификаций" />
            <input type="button" style = "margin-left:5px;" class = "btn btn-cancel-filter" value = "Очистить" title = "Очистить фильтры" />
          </div>
        </div>
      </fieldset>
  </div>
</script>
