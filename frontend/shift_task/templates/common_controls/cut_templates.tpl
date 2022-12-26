<!--ШАБЛОН ОТОБРАЖЕНИЯ ИТОГО ПО ФАКТАМ ШАБЛОНОВ-->
<script id="TemplateItogoView" type="text/template">
  <table class = 'data itogo-view' style = "font-weight: bold; margin-top: 10px;">
    <tfoot>
      <tr>
        <td style = "width:71%; border: none">Всего:</td>
        <td style = "width:9%" title="План"><%=plan%></td>
        <td style = "width:10%" title="Факт"><%=fact%></td>
        <td  style = "width:10%" title="Расчет"><%=in_calculate%></td>
      </tr>
    </tfoot>
  </table>
</script>

<!--ШАБЛОН ОТОБРАЖЕНИЯ УЧАСТКА НА КОТОРОМ ПРИМЕНЕН ШАБЛОН-->
<script id="TemplateSectorItemView" type="text/template">
  <li class="h3">
    <label class = 'lbl-plus' for="template-sector-<%=guid%>-<%=i%>">&nbsp;</label>
    <input type="checkbox" id="template-sector-<%=guid%>-<%=i%>" name="template-sector-<%=sector_id%>"  class = "sector-templates-cb-item cb-item" />
    <label class = "lbl-item h2" for="1template-sector-<%=guid%>-<%=i%>">
      <%=sector_name%>
    </label>
    <ul>
      <table class = 'data' >
        <thead>
          <tr>
            <td style = "width:70%">Шаблон</td>
            <td style = "width:10%">План</td>
            <td style = "width:10%">Факт</td>
            <td style = "width:10%">Расчет</td>
          </tr>
        </thead>
      </table>
    </ul>
  </li>
</script>

<!--ШАЛОН ОТОБРАЖЕНИЯ ЭЛЕМЕНТА ШАБЛОНА РАСКРОЯ С ВОЗМОЖНОСТЬЮ ЗАДАВАТЬ ОБЪЕМЫ-->
<script id="TemplateItemPlanView" type="text/template">
    <label class = 'lbl-plus' for="template-sector-<%=guid%>-<%=i%>-<%=j%>">&nbsp;</label>
    <input type="checkbox" id="template-sector-<%=guid%>-<%=i%>-<%=j%>" class = "template-cb-item cb-item" />
    <label style = "box-sizing: border-box;" class = "lbl-item h2 lbl-template-item <%=!count?'transparent':''%>" for="1template-sector-<%=guid%>-<%=i%>-<%=j%>">
      <table class = 'data'>
        <tbody>
          <tr>
            <td style = "width:70%"><%=name%></td>
            <td style = "width:10%"><%=qty%></td>
            <td style = "width:10%"><%=fact_count%></td>
            <!--<td style = "width:10%"><%=applied_count%></td>-->
            <td  style = "width:10%" class = "count">
              <input type="text" class="tb tb-template-count is-diggit" placeholder="0" <%=qty==fact_count?'disabled':''%> value="<%=count%>" title="Сколько раз применить шаблон">
            </td>
          </tr>
        </tbody>
      </table>
    </label>
    <ul class = "ul-template-item <%=!count?'transparent':''%>">
      <li class="h3">
        <table class = 'in-info'>
          <thead>
            <tr>
              <td style = "width:10%"><%=in_object['number']%></td>
              <td style = "width:80%"><%=in_object['name']%></td>
              <td style = "width:10%"><%=in_object['count']?in_object['count']:'1'%></td>
            </tr>
          </thead>
          <tbody>
            <%for (var out_item_index in out_objects)
               {
                var out_object = out_objects[out_item_index];%>
                <tr>
                  <td ><%=out_object['number']%></td>
                  <td ><%=out_object['name']%></td>
                  <td ><%=out_object['count']%></td>
                </tr>
            <%}%>
          </tbody>
        </table>
      </li>
    </ul>
</script>

<!--ШАЛОН ОТОБРАЖЕНИЯ ЭЛЕМЕНТА ШАБЛОНА РАСКРОЯ БЕЗ  ВОЗМОЖНОСТи ЗАДАВАТЬ ОБЪЕМЫ-->
<script id="TemplateItemPlanViewReadOnly" type="text/template">
    <label class = 'lbl-plus' for="template-sector-<%=guid%>-<%=i%>-<%=j%>">&nbsp;</label>
    <input type="checkbox" id="template-sector-<%=guid%>-<%=i%>-<%=j%>" class = "template-cb-item cb-item" />
    <label style = "box-sizing: border-box;" class = "lbl-item h2 lbl-template-item <%=!count?'transparent':''%>" for="1template-sector-<%=guid%>-<%=i%>-<%=j%>">
      <table class = 'data'>
        <tbody>
          <tr>
            <td style = "width:70%"><%=name%></td>
            <td style = "width:10%"><%=qty%></td>
            <td style = "width:10%"><%=fact_count%></td>
            <!--<td style = "width:10%"><%=applied_count%></td>-->
            <td  style = "width:10%" class = "count"><%=count%></td>
          </tr>
        </tbody>
      </table>
    </label>
    <ul class = "ul-template-item <%=!count?'transparent':''%>">
      <li class="h3">
        <table class = 'in-info'>
          <thead>
            <tr>
              <td style = "width:10%"><%=in_object['number']%></td>
              <td style = "width:80%"><%=in_object['name']%></td>
              <td style = "width:10%"><%=in_object['count']?in_object['count']:'1'%></td>
            </tr>
          </thead>
          <tbody>
            <%for (var out_item_index in out_objects)
               {
                var out_object = out_objects[out_item_index];%>
                <tr>
                  <td ><%=out_object['number']%></td>
                  <td ><%=out_object['name']%></td>
                  <td ><%=out_object['count']%></td>
                </tr>
            <%}%>
          </tbody>
        </table>
      </li>
    </ul>
</script>

<!--ШАЛОН ОТОБРАЖЕНИЯ ЭЛЕМЕНТА ШАБЛОНА РАСКРОЯ В РЕЖИМЕ READONLY-->
<script id="TemplateItemFactView" type="text/template">
    <label class = 'lbl-plus' for="template-sector-<%=guid%>-<%=i%>-<%=j%>">&nbsp;</label>
    <input type="checkbox" id="template-sector-<%=guid%>-<%=i%>-<%=j%>" class = "template-cb-item cb-item" />
    <label class = "lbl-item h2" for="1template-sector-<%=guid%>-<%=i%>-<%=j%>">
       <table class = 'data'>
        <tbody>
          <tr>
            <td style = "width:79%"><%=name%></td>
            <td style = "width:10%"><%=count%></td>
            <td  style = "width:10%" class = "count">
              <input type="text" class="tb tb-template-fact-count is-diggit" placeholder="0"  value="<%=fact_count%>" title="Сколько раз применен шаблон">
            </td>
          </tr>
        </tbody>
      </table>
    </label>
    <ul>
      <li class="h3">
        <table class = 'in-info'>
          <thead>
            <tr>
              <td style = "width:10%"><%=in_object['number']%></td>
              <td style = "width:80%"><%=in_object['name']%></td>
              <td style = "width:10%"><%=in_object['count']?in_object['count']:'1'%></td>
            </tr>
          </thead>
          <tbody>
            <%for (var out_item_index in out_objects)
               {
                var out_object = out_objects[out_item_index];%>
                <tr>
                  <td ><%=out_object['number']%></td>
                  <td ><%=out_object['name']%></td>
                  <td ><%=out_object['count']%></td>
                </tr>
            <%}%>
          </tbody>
        </table>
      </li>
    </ul>
</script>

<!--ВЕРСИЯ ДЛЯ ПЕЧАТИ-->
<script id="cutTemplatesPrintVersionTemplate" type="text/template">
  <span class="lbl" style = "font-size: 20px;" >Шаблоны раскроя</span>
  <div style="margin: 20px 0px 20px 0px;">
    <table class = 'in-info bordered-black'>
      <thead>
        <tr>
          <td style = "width:5%">№</td>
          <td style = "width:65%">Название</td>
          <td style = "width:10%">План</td>
          <td style = "width:10%">Факт</td>
        </tr>
      </thead>
      <tbody class = "templates-data-list">
      <%for (var i in data){
          var index = parseInt(i)+1;
          var template = data[i];%>
          <tr>
            <td><%=index%></td>
            <td ><%=template['name']%></td>
            <td ><%=template['count']%></td>
            <td ></td>
          </tr>
      <%}%>
      </tbody>
    </table>
  </div>
</script>
