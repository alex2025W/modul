<!-- Шаблон контейнер для списка занных -->
<script id="SpecificationMaterialsDataListTemplate" type="text/template">
  <!--controlBox-->
  <div class="line controls-line-container" style="width:690px;">
    <label class="checkbox" style = "float:right; margin-top:4px;">
        <input type="checkbox" <%=showEmptyGroups==='yes'? 'checked': ''%> value="no" id="show-empty-groups">
        <span>Показать пустые</span>
      </label>
  </div>
  <!--Data container-->
  <div class="css-treeview">
    <ul class="data-list"></ul>
  </div>
</script>

<!-- Шаблон отображения направления -->
<script id="SpecificationSectorItemTemplate" type="text/template">
  <li class = "h<%=level%> <%=count===0?'color-lightgrey':''%>">
    <label class="lbl-plus" for="sitem-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="sitem-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-sector lbl-item h<%=level%>"><%=name?name:'Не определено'%> (<%=count%>)</label>
    <ul class = "data-list data-sectors"></ul>
  </li>
</script>

<!-- Шаблон отображения категории -->
<script id="SpecificationCategoryItemTemplate" type="text/template">
  <li class = "h<%=level%> <%=count===0?'color-lightgrey':''%>">
    <label class="lbl-plus" for="sitem-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="sitem-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-category lbl-item h<%=level%>"><%=name?name:'Не определено'%> (<%=count%>)</label>
    <ul class = "data-list data-categories"></ul>
  </li>
</script>

<!-- Шаблон отображения группы -->
<script id="SpecificationGroupItemTemplate" type="text/template">
  <li class = "h<%=level%> <%=count===0?'color-lightgrey':''%>">
    <label class="lbl-plus" for="sitem-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="sitem-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-group lbl-item h<%=level%>"><%=name?name:'Не определено'%> (<%=count%>)</label>
    <ul class = "data-list data-groups"></ul>
  </li>
</script>

<!-- Шаблон отображения списка материалов -->
<script id="SpecificationMaterialsListTemplate" type="text/template">
  <thead>
    <tr>
      <% if('groupBy' in obj && groupBy.indexOf('sector_id')<0) {%>
        <th class="column-data sector_id" style = "width:8%"><span>Направление</span></th>
      <%}%>
      <% if('groupBy' in obj && groupBy.indexOf('category_id')<0) {%>
        <th class="column-data category_id" style = "width:8%"><span>Категория</span></th>
      <%}%>
      <% if('groupBy' in obj && groupBy.indexOf('group_id')<0) {%>
        <th class="column-data group_id" style = "width:8%"><span>Группа</span></th>
      <%}%>
      <th class="column-data global_code"style = "width:5%"><span>Код</span></th>
      <th class="column-data full_key"style = "width:5%"><span>Артикул</span></th>
      <th class="column-data materials_name" style = "width:15%"><span>Материал</span></th>
      <th class="column-data unique_props_info" style = "width:16%"><span>Характеристики</span></th>
      <th class="column-data note" style = "width:15%"><span>Примечание</span></th>
      <th class="column-data pto_size" style = "width:3%">
        <span>Объем</span>
        <a class="lnk lnk-paste-from" title="Вставить">
          <i class="fa fa-clipboard"></i>
        </a>
      </th>
      <!--<th class="column-data allowance" style = "width:3%"><span>Допуск</span></th>-->
      <th class="column-data materials_unit_pto" style = "width:5%"><span>Ед. изм</span></th>
      <th class="column-data status" style = "width:5%"><span>Статус</span></th>
      <th style = "width:4%"></th>
    </tr>
  </thead>
  <tbody class = "materials-body"></tbody>
</script>

<!-- Шаблон отображения подвала для списка материалов -->
<script id="SpecificationMaterialsListFooterTemplate" type="text/template">
  <tfoot>
    <th colspan="12">
      <div class = "line list-pager" id = "list-pager"></div>
    </th>
  </tfoot>
</script>

<!-- Шаблон отображения конкретного материала -->
<script id="SpecificationMaterialItemTemplate" type="text/template">
  <%var full_key = materials_group_key + '.' + materials_key;
    if(unique_props_info && unique_props_info['key'])
      full_key += '.' + unique_props_info['key'];

    var has_unique_props = (materialInfo['unique_props'] || []).filter(
      function(x){ return x['is_active'] &&  x['type'] == 'preset' }
    ).length > 0;

    var unique_props_arr = (materialInfo['unique_props'] || []);

    /*var unique_props_arr = (materialInfo['unique_props'] || []).filter(
      function(x){ return x['is_active'] }
    );*/%>

    <% if('groupBy' in obj && groupBy.indexOf('sector_id')<0) {%>
      <td class = "sector_id"><%=sector_name?sector_name:'Не определено'%></td>
    <%}%>
    <% if('groupBy' in obj && groupBy.indexOf('category_id')<0) {%>
    <td class = "category_id"><%=category_name?category_name:'Не определено'%></td>
  <%}%>
  <% if('groupBy' in obj && groupBy.indexOf('group_id')<0) {%>
    <td class = "group_id"><%=group_name?group_name:'Не определено'%></td>
  <%}%>

  <td class = "global_code"><%=materials_global_code%></td>
  <td class = "full_key"><%=full_key%></td>
  <td class = "materials_name"><%=materials_name%></td>
  <td class = "unique_props_info">
    <% if(unique_props_arr.length>0){%>
      <% if(can_edit && status!=1 && status!=2 && status!=3 && status!=4 && status!=5){%>
        <select
          style="width:200px;"
          class="ddl-unique-props">
          <option value = "" data-name = "Не заданы">Не заданы</option>
          <% for(var i in unique_props_arr){
            if(
              (unique_props_arr[i]['is_active'] && (!has_unique_props || unique_props_arr[i]['type'] == 'preset')) ||
              (unique_props_info && unique_props_arr[i]['_id'] == unique_props_info['_id']))
              {%>
            <option
              data-name = "<%=unique_props_arr[i]['name']%>"
              data-key="<%=unique_props_arr[i]['key']%>"
              <%=((unique_props_info && unique_props_arr[i]['_id'] == unique_props_info['_id'])?'selected':'')%>
              value="<%=unique_props_arr[i]['key']%>">
              <%=unique_props_arr[i]['key']%>. <%=unique_props_arr[i]['name']%>
            </option>
          <%}}%>
        </select>
      <%}else{%>
        <span clas = "lbl">
            <%=((unique_props_info)?unique_props_info['name']:'Не заданы')%>
        </span>
      <%}%>


    <%}else{%>
      <span class="lbl">Нет характеристик</span>
    <%}%>
  </td>
  <td class = "note">
    <span class='lnk lnk-note' style="color: #06c;"><%= obj.note ? Routine.stripTags(note):'Не задано' %></span>
    <input
      style="display:none; width: 90%;"
      type="text"
      class="note tb-note"
      <%= can_edit ?'':'disabled'%> value="<%= obj.note ? Routine.stripTags(note):'' %>" />
  </td>
  <td class = "pto_size">
    <input
      type="text"
      class = "value"
      <%=can_edit && status!=1 && status!=2 && status!=3 && status!=4 && status!=5?'':'disabled'%>
      value="<%= Routine.floatToStr(pto_size) %>" />
  </td>
  <td class = "allowance" style = "display:none">
    <input
      type="text"
      class = "allowance"
      <%= can_edit ?'':'disabled'%>
      value="<%= allowance? Routine.floatToStr(allowance):'0' %>" />
  </td>
  <td class = "materials_unit_pto"><%=materials_unit_pto%></td>
  <td class = "status">
    <select
      <%=can_edit?'':'disabled'%>
      tabindex="<%=index+1%>"
    >
      <option value="5" <%= (status=='5')?'selected':'' %>>Требуется</option>
      <option value="0" <%= (status=='0')?'selected':'' %>>В расчете</option>
      <option value="3" <%= (status=='3')?'selected':'' %>>На согласовании</option>
      <% if(extended_user || status=='1'){ %>
        <option value="1" <%= (status=='1')?'selected':'' %>>Согласовано</option>
      <% } %>
      <% if(extended_user || status=='2'){ %>
        <option value="2" <%= (status=='2')?'selected':'' %>>Отклонено</option>
      <% } %>
    </select>
  </td>
  <td style = "white-space: nowrap;">
    <a class="lnk lnk-clone" title="Копировать материал">
      <i class="fa fa-clone"></i>
    </a>

    <% if (status!=='1' && (!statuses || !_.any(statuses, function (element){ return element['status'] === '1' }) )) {%>
      <a class="lnk lnk-remove" title="Удалить из расчета">
        <i class="fa fa-times"></i>
      </a>
    <%}%>
  </td>
</script>
