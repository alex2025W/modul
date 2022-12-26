<!-- Шаблон контейнер для списка занных -->
<script id="MaterialsDataListTemplate" type="text/template">
  <!--controlBox-->
  <div class="line controls-line-container">
    <span
      class="lnk lnk-add-material"
      style = "float:right; margin-top:2px;" >
        <i class="fa fa-plus"></i>&nbsp;Добавить нестандартный материал
    </span>
    <label class="checkbox" style = "float:right; margin-right: 20px;">
        <input type="checkbox" <%=showNotStandartMaterials==='yes'? 'checked': ''%> value="no" id="show-not-standart-materials">
        <span>Показать нестандартные материалы</span>
      </label>
  </div>
  <!--Data container-->
  <div class="css-treeview">
    <ul class="data-list"></ul>
  </div>
  <!--Edit/add materil container-->
  <div class="line edit-material-container" style="display: none"></div>
</script>

<!-- Шаблон отображения направления -->
<script id="SectorItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-sector lbl-item h<%=level%>"><%=name%></label>
    <ul class = "data-list data-sectors"></ul>
  </li>
</script>

<!-- Шаблон отображения категории -->
<script id="CategoryItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-category lbl-item h<%=level%>"><%=name%></label>
    <ul class = "data-list data-categories"></ul>
  </li>
</script>

<!-- Шаблон отображения группы -->
<script id="GroupItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-group lbl-item h<%=level%>"><%=name%></label>
    <ul class = "data-list data-groups"></ul>
  </li>
</script>

<!-- Шаблон отображения списка материалов -->
<script id="MaterialsListTemplate" type="text/template">
  <thead>
    <tr>
      <% if('groupBy' in obj && groupBy.indexOf('sector_id')<0) {%>
        <th class="column-data sector_id" style = "width:10%"><span>Направление</span></th>
      <%}%>
      <% if('groupBy' in obj && groupBy.indexOf('category_id')<0) {%>
        <th class="column-data category_id" style = "width:10%"><span>Категория</span></th>
      <%}%>
      <% if('groupBy' in obj && groupBy.indexOf('group_id')<0) {%>
        <th class="column-data group_id" style = "width:10%"><span>Группа</span></th>
      <%}%>
      <th class="column-data global_code"style = "width:8%"><span>Код</span></th>
      <th class="column-data material_key"style = "width:5%"><span>Артикул</span></th>
      <th style = "width:5%"></th>
      <th class="column-data material_name" style = "width:30%"><span>Материал</span></th>
      <th style = "width:10%"><span>Ед. изм</span></th>
    </tr>
  </thead>
  <tbody class = "materials-body"></tbody>
</script>

<!-- Шаблон отображения подвала для списка материалов -->
<script id="MaterialsListFooterTemplate" type="text/template">
  <tfoot>
    <th colspan="8">
      <div class = "line list-pager" id = "list-pager"></div>
    </th>
  </tfoot>
</script>

<!-- Шаблон отображения конкретного материала -->
<script id="MaterialItemTemplate" type="text/template">
  <% if('groupBy' in obj && groupBy.indexOf('sector_id')<0) {%>
    <td class = "sector_id"><%=sector_name%></td>
  <%}%>
  <% if('groupBy' in obj && groupBy.indexOf('category_id')<0) {%>
    <td class = "category_id"><%=category_name%></td>
  <%}%>
  <% if('groupBy' in obj && groupBy.indexOf('group_id')<0) {%>
    <td class = "group_id"><%=group_name%></td>
  <%}%>
  <td class = "global_code"><%=material_global_code%></td>
  <td class = "material_key"><%=material_group_code%>.<%=material_code%></td>
  <td>
    <% if(obj.in_calculate){%>
      <!--<a class="lnk-remove-from-calculate" title="Удалить из расчетов">
        <i class="fa fa-check-circle-o"></i>
      </a>-->
      <span class = 'lbl-already-in-calculate' title="Материал уже в расчете. Для дальнейшей работы с материалом переходите в расчеты. ">
        <i class="fa fa-check-circle-o"></i>
      </span>
    <%}else{%>
    <a class="lnk-add-to-calculate " title="Добавить в расчет">
      <i class="fa fa-calculator"></i>
    </a>
    <%}%>
  </td>
  <td class = "material_name">
    <% if (material_type == 'not_standart'){%>
      <span class = "lnk lnk-edit-material"><%=material_name%></span>
    <%}else{%>
      <%=material_name%>
    <%}%>
  </td>
  <td class = "material_unit_pto"><%=material_unit_pto%></td>
</script>

<!-- Шаблон отображения списка связанных материалов -->
<script id="LinkedMaterialsListTemplate" type="text/template">
  <table class="in-info">
    <thead>
      <tr>
        <th class="column-data material_key"style = "width:10%"><span>Артикул</span></th>
        <th class="column-data material_name" style = "width:70%"><span>Материал</span></th>
        <th style = "width:10%"><span>Объем</span></th>
        <th style = "width:10%"><span>Ед. изм</span></th>
      </tr>
    </thead>
    <tbody class = "materials-body">
      <% for(var i in obj) { var row = obj[i]; %>
        <tr>
          <td><%=row.group_code%>.<%=row.code%></td>
          <td><%=row.name%></td>
          <td><%=row.volume%></td>
          <td><%=row.unit_pto%></td>
        </tr>
      <% } %>
    </tbody>
  </table>
</script>