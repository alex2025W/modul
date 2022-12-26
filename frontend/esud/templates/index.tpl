%import json
% def scripts():
  <!--styles-->
  <link href="/static/css/dataTables.fixedHeader.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/jquery.qtip.min.css?v={{version}}" rel="stylesheet" media="screen">
  <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
  <link href="/static/css/jquery.treetable.css?v={{version}}" rel="stylesheet" media="screen">
  <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css">
  <!--componentns-->
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backbone.ribs.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.dataTables-1.10.0.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dataTables.fixedHeader-1.10.0.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-contextmenu.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.treetable.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.qtip.min.js?v={{version}}"></script>
  <script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/jquery-ui.min.js"></script>
  <!---->
  <link href="/frontend/esud/styles/esud.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/esud/scripts/app.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/router.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/preloader.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/models.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/collections.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/views.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/edit_element_dlg_view.js?v={{version}}"></script>
  <script src="/frontend/esud/scripts/confirm_redefine_element_dlg_view.js?v={{version}}"></script>
  <!--<script src="/static/scripts/libs/reconnecting-websocket.js?v={{version}}"></script>-->

  <script>$(function() {
      bootbox.setDefaults({locale: "ru",});
      App.initialize({{! data }},{{! system_objects }});
    });
  </script>
% end
% rebase master_page/base_lastic page_title='ЭСУД', current_user=current_user, version=version, scripts=scripts, menu=menu

<!--BREAD CRUMP -->
<script id="breadCrumpItem" type="text/template">
  <a href="javascript:;" title = "<%=number?number + '. ':''%><%=name%>"><%=number?number + '. ':''%><%=name%></a>
</script>
<script id="breadCrumpActiveItem" type="text/template">
  <span title = "<%=number?number:''%> <%=name%>"><%=number?number:''%>. <%=name%></span>
</script>
<script id="breadCrumpDivider" type="text/template">
  <li><span class="divider">/</span><li>
</script>
<!--CUR ITEM INFO -->
<script id="infoPanelItem" type="text/template">
  <% if(obj){
      var p1 = ""; var p2=""; for(var i in obj.properties) {
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
          p1 = obj.properties[i].values[0].value.value;
      }
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
        p2 = obj.properties[i].values[0].value.value;
      }
   }} %>
  <span><%= obj?(obj.number?obj.number+'.&nbsp;':''):''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=(obj)?name + " ["+App.DecodeType(type,is_buy, is_complect, is_otbor)['short_type'] + ']':'/'%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></span>
</script>


<!--DIRECTORY TABLE VIEW TEMPLATES-->
<!--List-->
<script id="directoryTableTemplate" type="text/template">
  <table class="table display directory-table">
    <thead style = "display:none">
      <th>Название</th>
      <th style = "display:none">Тип</th>
    </thead>
    <tbody class = "connectedSortable">
    </tbody>
  </table>
</script>
<!--header-->
<script id="headerTableTemplate" type="text/template">
  <table class="table display directory-table-header directory-table-header-base">
    <thead>
      <th class = "name" style = "width:100%">Название</th>
      <th class = "type" style = "width:10%; display:none">Тип</th>
    </thead>
  </table>
</script>
<script id="headerTableTemplateT" type="text/template">
  <table class="table display directory-table-header directory-table-header-template">
    <thead>
      <th class = "name" style = "width:80%">Название</th>
      <th class = "count" style = "width:10%">Кол-во</th>
      <th class = "unit" style = "width:10%">Ед.</th>
      <th class = "type" style = "width:10%; display:none;">Тип</th>
    </thead>
  </table>
</script>
<!--Item-->
<script id="itemTableTemplate" type="text/template">
  <%var decodedType =  App.DecodeType(type,is_buy, is_complect, is_otbor); %>
  <td class="name" style = "width:100%">
    <i class="fa <%=((have_childs)?'fa-plus-square-o':'fa-square-o')%> "></i>
    <% var p1 = ""; var p2=""; for(var i in obj.properties) { %>
      <% if(App.SystemObjects['items'] && (obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p1 = obj.properties[i].values[0].value.value %>
      <% } %>
      <% if( App.SystemObjects['items'] && (obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p2 = obj.properties[i].values[0].value.value %>
      <% } %>
    <% } %>
      <span class = "lnk item <%=(App.complexItems.indexOf(type)>-1 && ( !datalink || datalink=='' || type!='product') )?'lnk-item-name':''%>  <%=(datalink && datalink!='')?'link':''%> <%=(datalink && datalink!='' && type=='product')?'product-link':''%>  <%=(is_system || is_objective_system)?'system':''%> <%=(is_pseudo_child)?'pseudo':''%> <%=(status && status=='del')?'del':''%> <%=type%> " data-id="<%=_id %>" title='<%=note %>'>[<%=decodedType['short_type'] %>]&nbsp;<%= obj.number?obj.number+'.&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name %><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %>
      </span>
    <% if(note && note!='') {%>
      <span class = 'icon-note' title = "Примечание"><i class="fa fa-sticky-note-o"></i></span>
    <%}%>
    <% if(datalink && datalink!='') {%>
      <span class = 'icon-link' title = "Открыть исходный объект: Клик - в этом окне; SHIFT+Клик - в соседнем"><i class="fa fa-external-link"></i></span>
    <%}%>
  </td>
  <td class = "type" title= "шт." style = "width:10%; display:none;">шт.</td>
</script>
<script id="itemTableTemplateC" type="text/template">
  <%var decodedType =  App.DecodeType(type,is_buy, is_complect, is_otbor); %>
  <td class="name" style = "width:100%">
    <i class="fa <%=((have_childs)?'fa-plus-square-o':'fa-square-o')%> "></i>
    <% var p1 = ""; var p2=""; for(var i in obj.properties) { %>
      <% if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p1 = obj.properties[i].values[0].value.value %>
      <% } %>
      <% if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p2 = obj.properties[i].values[0].value.value %>
      <% } %>
    <% } %>
      <span class = "lnk item <%=(App.complexItems.indexOf(type)>-1 /*&& ( !datalink || datalink=='' || type!='product')*/ )?'lnk-item-name':''%>  <%=(datalink && datalink!='')?'link':''%> <%=(datalink && datalink!='' && type=='product')?'product-link1':''%> <%=(is_pseudo_child)?'pseudo':''%>  <%=(is_system || is_objective_system)?'system':''%> <%=(status && status=='del')?'del':''%> <%=type%> " data-id="<%=_id %>" title='<%=note %>'>[<%=decodedType['short_type'] %>]&nbsp;<%= obj.number?obj.number+'.&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name %><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></span>
    <% if(note && note!='') {%>
      <span class = 'icon-note' title = "Примечание"><i class="fa fa-sticky-note-o"></i></span>
    <%}%>
    <% if(datalink && datalink!='') {%>
      <span class = 'icon-link' title = "Открыть исходный объект: Клик - в этом окне; SHIFT+Клик - в соседнем"><i class="fa fa-external-link"></i></span>
    <%}%>
  </td>

  <td class = "type" title= "<%=decodedType['type'] %>" style = "width:10%; display:none;">
    <%=decodedType['short_type'] %>
  </td>
</script>
<script id="itemTableTemplateT" type="text/template">
  <% if(obj){
      var p1 = ""; var p2=""; for(var i in obj.properties) {
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
          p1 = obj.properties[i].values[0].value.value;
      }
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
        p2 = obj.properties[i].values[0].value.value;
      }
   }} %>
  <td class="name" style = "width:80%">
    <%var decodedType =  App.DecodeType(type,is_buy, is_complect, is_otbor); %>
    <i class="fa <%=((have_childs)?'fa-plus-square-o':'fa-square-o')%> "></i>
    <span class = "lnk item <%=(App.complexItems.indexOf(type)>-1 /*&& ( !datalink || datalink=='' || type!='product')*/ )?'lnk-item-name':''%>  <%=(datalink && datalink!='')?'link':''%> <%=(datalink && datalink!='' && type=='product')?'product-link1':''%> <%=(is_pseudo_child)?'pseudo':''%>  <%=(is_system || is_objective_system)?'system':''%> <%=(status && status=='del')?'del':''%> <%=type%> " data-id="<%=_id %>" title='<%=note %>'>[<%=decodedType['short_type'] %>]&nbsp;<%= obj.number?obj.number+'.&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name %><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></span>
    <% if(note && note!='') {%>
      <span class = 'icon-note' title = "Примечание"><i class="fa fa-sticky-note-o"></i></span>
    <%}%>
    <% if(datalink && datalink!='') {%>
      <span class = 'icon-link' title = "Открыть исходный объект: Клик - в этом окне; SHIFT+Клик - в соседнем"><i class="fa fa-external-link"></i></span>
    <%}%>
  </td>
  <td class = "count" style = "width:10%; padding:6px;">
    <%var count = 1;
      if('prop' in obj && obj['prop'])
      {
        count = prop['value']['value'];
        if(!count)
          count = "1";
      }%>
    <input type = "text" class = "tb-count" value = "<%=count%>" style = "<%=(type!='operation' && type!='product')?'display:none':'' %>" />
  </td>
  <td class = "unit" style = "width:10%;">
    <span class="unit-val"><%=('unit_val' in obj && obj['unit_val'])?obj['unit_val']:'' %></span>
  </td>
  <td class = "type" title= "<%=decodedType['type'] %>" style = "width:10%; display:none;">
    <%=decodedType['short_type'] %>
  </td>
</script>
<!--Context menu-->
<div id="itemContextMenu" style = "display:none">
  <ul class="dropdown-menu usual-menu" role="menu">
    <li class ="add"><a tabindex="-1" data-val = "add">Добавить</a></li>
    <li class ="edit"><a tabindex="-1" data-val = "edit">Редактировать</a></li>
    <li class ="remove"><a tabindex="-1" data-val = "remove">Удалить</a></li>
    <li class ="link"><a tabindex="-1" data-val = "link">Ярлык</a></li>
    <li class = "copy"><a tabindex="-1" data-val = "copy">Копировать</a></li>
    <li class = "move"><a tabindex="-1" data-val = "move">Переместить</a></li>
    <li class = "go-to-link"><a tabindex="-1" data-val = "go-to-link">Перейти по ссылке</a></li>
    <li class = "redefine"><a tabindex="-1" data-val = "redefine">Переопределить</a></li>
    <li class="divider"></li>
    <li class = "open-in-near-window"><a tabindex="-1" data-val = "open-in-near-window">Открыть в др. окне</a></li>
    <li class = "open-in-source"><a tabindex="-1" data-val = "open-in-source">Открыть в источнике</a></li>
    <li class = "open-tree"><a tabindex="-1" data-val = "open-tree">Открыть дерево</a></li>
    <li class = "open-graph"><a tabindex="-1" data-val = "open-graph">Открыть граф</a></li>
    <!--<li class = "open-calculation"><a tabindex="-1" data-val = "open-calculation">Расчет</a></li>-->
    <li class = "open-specification"><a tabindex="-1" data-val = "open-specification">Спецификация изделия</a></li>
    <li class = "create-product"><a tabindex="-1" data-val = "create-product">Создать изделие</a></li>
    <li class = "create-by-template"><a tabindex="-1" data-val = "create-by-template">Создать по шаблону</a></li>
    <li class = "open-complect"><a tabindex="-1" data-val = "open-complect">Комплектация изделия</a></li>
    <li class="divider"></li>
    <li class ="cancel"><a tabindex="-1" data-val = "cancel">Отмена</a></li>
  </ul>
</div>


<!--DIRECTORY TREE VIEW TEMPLATES-->
<!--List-->
<script id="directoryTreeTemplate" type="text/template">
  <table class="table treetable">
    <tbody>
    </tbody>
  </table>
</script>
<script id="itemTreeTemplate" type="text/template">
  <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false, ('is_complect' in node)?node['is_complect']:false, ('is_otbor' in node)?node['is_otbor']:false); %>
  <tr data-tt-id="<%= id %>" <% if(parent_id) {%> data-tt-parent-id="<%= parent_id %>" <% } %> data-configpath="<%= configuration_path %>" data-property-id="<%= obj.property_id %>"  data-linkpath="<%= linkpath  %>" data-id="<%= node_id %>" data-linktooriginobject="<%= datalink %>" data-propertylinkpath="<%= obj.proplinkpath %>"  data-property-originid="<%= obj.property_origin_id %>" data-needupdate='<%= node.need_update?true:false %>' class="<%= enabled?'':'tr-disabled' %>" >
    <td class="name">
      <% if(obj.has_checkbox) {%>
        <input type="checkbox" class = "cb-option" style="width:auto;" <%= obj.is_checked?'checked':'' %> title= "<%= enabled?'':'Редактирование изделия на вложенном уровне запрещено. Откройте изделие на корневом уровне' %>" />
      <% } %>

      <span class="type <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>">[<%=decodedType['short_type'] %>]</span>
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'.&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name %><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+(obj.is_modified?' (мод.)':'')+']</span>':''%>
      </span>
      <span class = 'icon-link lnk_open_in_near_window' data-link="<%= (datalink)?datalink:node_id%>"  title = "Открыть исходный объект в соседнем"><i class="fa fa-external-link"></i></span>
      <span style = "margin-left:5px;<%=((obj.is_modified)?'':'display:none') %>" class = 'icon-link lnk_return_to_original_values' data-link="<%= (datalink)?datalink:node_id%>"  title = "Возврат к значениям на корневом уровне"><i class="fa fa-undo"></i></span>
    </td>
    <td class="value" title= "<%= enabled?'':'Редактирование изделия на вложенном уровне запрещено. Откройте изделие на корневом уровне' %>"><%= value %></td>
    <td class="unit"><%= unit %></td>
    <td class = "type" title= "<%=decodedType['type'] %>" style = "display:none">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>
<script id="itemTreeTemplateModel" type="text/template">
  <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false,('is_complect' in node)?node['is_complect']:false, ('is_otbor' in node)?node['is_otbor']:false); %>
  <tr class="model-data <%= checked?'config-checked':'' %> <%= enabled?'':'tr-disabled' %>" data-tt-id="<%= id %>" <% if(parent_id) {%> data-configpath="<%= configuration_path %>" data-tt-parent-id="<%= parent_id %>" <% } %> data-linkpath="<%= linkpath  %>" data-id="<%= node_id %>" data-linktooriginobject="<%= datalink %>">
    <td class="name">
      <% var is_parent_buy_group = (('is_parent_buy_group' in obj && obj['is_parent_buy_group'])?true:false)%>
      <input type="checkbox" style = "<%=((is_parent_buy_group)?'display:none':'')%>" title= "<%= enabled?'':'Редактирование изделия на вложенном уровне запрещено. Откройте изделие на корневом уровне' %>" class = 'cb-config' <%= checked?"checked":"" %> />

      <span class="type <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>">[<%=decodedType['short_type'] %>]</span>
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'.&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name%><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+']</span>':''%><%= (obj.is_modified?'&nbsp;<span class = "lbl-light">(мод.)</span>':'') %>
      </span>
      <span class = 'icon-link lnk_open_in_near_window' data-link="<%= (datalink)?datalink:node_id%>"  title = "Открыть исходный объект в соседнем"><i class="fa fa-external-link"></i></span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>

    <td class = "type" title= "<%=decodedType['type'] %>" style = "display:none">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>

<script id="itemTreeTemplateCondition" type="text/template">
  <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false,('is_complect' in node)?node['is_complect']:false, ('is_otbor' in node)?node['is_otbor']:false); %>
  <tr class="model-data <%= enabled?'':'tr-disabled' %>" data-tt-id="<%= id %>" <% if(parent_id) {%> data-configpath="<%= configuration_path %>" data-tt-parent-id="<%= parent_id %>" <% } %> data-linkpath="<%= linkpath  %>" data-id="<%= node_id %>" data-linktooriginobject="<%= datalink %>">
    <td class="name">
      <input type="checkbox" title= "<%= enabled?'':'Редактирование изделия на вложенном уровне запрещено. Откройте изделие на корневом уровне' %>" class = "cb-condition" <%= checked?"checked":"" %> />
      <span class="type <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>">[<%=decodedType['short_type'] %>]</span>
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= ((node_path)?node_path+' / ':'')+ name%>
      </span>
      <span class = 'icon-link lnk_open_in_near_window' data-link="<%= (datalink)?datalink:node_id%>"  title = "Открыть исходный объект в соседнем"><i class="fa fa-external-link"></i></span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>
    <td class = "type" title= "<%=decodedType['type'] %>" style = "display:none;">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>

<script id="itemTreeTemplatePropValue" type="text/template">
  <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false); %>
  <tr class="model-data <%= enabled?'':'tr-disabled' %>" data-datalink="<%= datalink %>"  data-tt-id="<%= id %>" data-property-id="<%= property_id %>" <% if(parent_id) {%> data-configpath="<%= configuration_path %>" data-tt-parent-id="<%= parent_id %>" <% } %> data-is_optinal = "<%= obj.is_optional?1:0 %>" data-linkpath="<%= linkpath  %>" data-propertylinkpath="<%= proplinkpath %>" data-id="<%= node_id %>" data-property-originid="<%= property_origin_id %>">
    <td class="name">
      <% if(!obj.is_optional) {%>
        <input type="radio" title= "<%= enabled?'':'Редактирование изделия на вложенном уровне запрещено. Откройте изделие на корневом уровне' %>" name="rdval-<%= parent_guid %>" class = "cb-propvalue" <%= checked?"checked":"" %> />
      <% } %>
      <% if (is_open) { %>
        <input type="text" style="width:200px;" class="value-val" data-id="<%= node_id %>" value="<%= value && value['value'] %>"  title = "<%= value && value['value'] %>" <%= checked?'':'disabled' %> />
      <% } else { %>
        <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><span class="value-val" data-id="<%= node_id %>">[<%=decodedType['short_type'] %>]&nbsp;<%= name%></span>
        </span>
      <% } %>
      <span class = 'icon-link lnk_open_in_near_window' data-link="<%= (datalink)?datalink:node_id%>"  title = "Открыть исходный объект в соседнем"><i class="fa fa-external-link"></i></span>
    </td>
    <td class="value"></td>
    <td class="unit">
      <%  var additional = "";
        var s_unit = null;
        if(units.length>0){
          s_unit = units[0];
          for(var k in units) {
            if(unit && unit['id']==units[k].node['_id'])
              s_unit = units[k];
          }
          if(s_unit.children && s_unit.children.length>0){
            var ch = s_unit.children;
            while(additional=="" && ch.length>0){
              var nch = [];
              for(var i in ch){
                if(ch[i].node['type']=='unit'){
                  additional = ch[i].node['name'];
                  break;
                }
                if(ch[i].children && ch[i].children.length>0){
                  nch = nch.concat(ch[i].children);
                }
              }
              ch = nch;
            }
          }
      } %>
      <% if(units.length==1) {%>
        <%= units[0].node['name'] %>
      <% } else if (units.length>1) {%>
        <select class="unit-val" <%= (checked || obj.is_optional)?'':'disabled' %> <%= additional?' style="width:50%;"':'' %> >
          <% for(var k in units) {%>
            <option value="<%= units[k].node['_id'] %>" <%= (unit && unit['id']==units[k].node['_id'])?'selected':'' %> ><%= units[k].node['name'] %></option>
          <%  }%>
        </select>
      <% } %>
      <%= additional?(' / '+additional):'' %>
    </td>

    <td class = "type" title= "<%=decodedType['type'] %>" style = "display:none">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>


<script id="itemTreeTemplateNoConfiguratoin" type="text/template">
  <tr class="model-data" data-tt-id="<%= id %>" <% if(parent_id) {%> data-tt-parent-id="<%= parent_id %>" <% } %>>
    <td class="name">
      <span class='lblerr'>Ошибка! Не задана конфигурация.</span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>
    <td class="type" style = "display:none">Ошибка</td>
  </tr>
</script>

<!--SEARCH RESULT VIEW TEMPLATES-->
<!--List-->
<script id="searchResultTemplate" type="text/template">
  <table class="table display search-table">
    <thead style = "display:none">
      <th>Название</th>
      <th style = "display:none;">Тип</th>
      <th>Путь</th>
    </thead>
    <tbody>
    </tbody>
  </table>
</script>
<!--Item-->
<script id="searchItemTemplate" type="text/template">
  <td class="name">
     <% var p1 = ""; var p2=""; for(var i in obj.properties) { %>
      <% if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path==""&& obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p1 = obj.properties[i].values[0].value.value %>
      <% } %>
      <% if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) { %>
        <%  p2 = obj.properties[i].values[0].value.value %>
      <% } %>
    <% } %>
    <span class = "lnk item <%=(App.complexItems.indexOf(type)>-1 && ( !datalink || datalink=='' || type!='product') )?'lnk-item-name':''%> <%=(datalink && datalink!='')?'link':''%> <%=(datalink && datalink!='' && type=='product')?'product-link':''%> <%=(status && status=='del')?'del':''%> <%=type%> " data-id="<%=_id %>" title='<%=note %>'>[<%=App.shortTypeNames[type] %>]&nbsp;<%= obj.number?obj.number+'. &nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name %><%= p2?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></span>
    <% if(datalink && datalink!='') {%>
      <span class = 'icon-link'><i class="fa fa-external-link"></i></span>
    <%}%>
  </td>
  <td class = "type" title= "<%=App.typeNames[type] %>" style = "display:none">
    <%=App.shortTypeNames[type] %>
  </td>
  <td class = "path">
    <div class = "info" title = "<%=dacoded_path%>"><%=dacoded_path%></div>
  </td>
</script>

<!--ITEM EDIT TEMPLATE-->
<script id="newElementTemplate" type="text/template">
  <%var is_new_object = !(obj && '_id' in obj)%>
  <div class="modal new-element-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5><%= !is_new_object?"Редактирование элемента":"Добавление элемента" %></h5>
    </div>
    <div class="modal-body form-horizontal">
      <div class="control-group">
        <label class="control-label">Название</label>
        <div class="controls">
          <input type="text" placeholder="Название" class="name" value="<%= obj && obj.name?obj.name.replace(/\"/g,'&quot;'):'' %>"  <%=(obj && obj.type=='value' && obj.open_value) %>>
        </div>
      </div>
      <% if(obj['datalink']){ %>
        <div class="control-group">
          <label class="control-label">Источник</label>
          <div class="controls">
            <input type="text" placeholder="Источник" class="alias" value="<%= obj?(obj.alias || obj.name).replace(/\"/g,'&quot;'):'' %>"  <%=(obj && ((obj.type=='value' && obj.open_value) || (obj['datalink']) )) ?'disabled':''%>>
          </div>
        </div>
      <% } %>
      <div class="control-group pnl-null-value" style = "<%=(obj && obj.type=='value' && obj.open_value)?'':'display:none'%>">
        <label class="control-label"></label>
        <div class="controls">
          <label style = "float:left"><input type="checkbox" class = "cb cb-open-value" <%=(obj && obj.type=='value' && obj.open_value)?'checked':''%> style = "margin:2px 0px 0px 6px;" /><span  style = "float:left;">Открытое значение</span></label>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label">Тип</label>
        <div class="controls" >
           <select class="type" <%=(!is_new_object || (obj && obj.type) )?'disabled':'' %>><%if('_id' in obj || 'type' in obj){%>
            <option value="<%=obj.type%>" selected><%=App.typeNames[obj.type]%></option><%}
           else{
            var canIncludeTypes = App.GetCanIncludeTypes(parent_id);
            for(var i in canIncludeTypes){%>
              <option value="<%=canIncludeTypes[i]%>" <%= (App.GetEditDialogAutosave() && App.GetEditDialogAutosave()==canIncludeTypes[i])?'selected':'' %> ><%=App.typeNames[canIncludeTypes[i]]%></option><%}}%>
          </select>
          <% if(is_new_object) {%>
            <label class="checkbox" style="display:inline-block; margin-left:10px;"><input type="checkbox" class="type-remember" <%= App.GetEditDialogAutosave()?"checked":"" %> />запомнить</label>
          <% } %>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label">Примечание:</label>
        <div class="controls">
          <textarea  type="text" rows="7" placeholder="Введите примечание" class="note" ><%= obj?obj.note:"" %></textarea>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <a href="javascript:;" class="btn btn-primary btn-save">Сохранить</a>
      <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</a>
    </div>
  </div>
</script>

<!--BREADCRUMBS MODAL TEMPLATE-->
<script id="modalBreadCrumbsTemplate" type="text/template">
  <div class="modal breadcrumbs-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Весь путь</h5>
    </div>
    <div class="modal-body form-horizontal">
        <ul class="breadcrumb-modal"></ul>
    </div>
    <div class="modal-footer">
      <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</a>
    </div>
  </div>
</script>

<!-- Modal -->
<div id="modalNote" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">
  <div class="modal-header">
  <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
  <h3 id="myModalLabel" style = "border-bottom:none;">Примечание</h3>
  </div>
  <div class="modal-body">
  </div>
  <div class="modal-footer" style ="background-color:#fff;">
  <button class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</button>
  </div>
</div>

<!--CONFIRM REBASE ELEMENT TEMPLATE-->
<script id="confirmRedefineElementTemplate" type="text/template">
  <div class="modal redefine-element-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Переопределение объекта</h5>
    </div>
    <div class="modal-body form-horizontal">
      Данный объект отображается из источника ярлыка, внутри которого вы находитесь.<br/> Для работы с объектом вы можете переопределить данный объект внутри ярлыка или открыть его в источнике ярлыка.
    </div>
    <div class="modal-footer">
      <div class="control-group">
        <div class="controls">
          <select class="type" style = "margin:10px;">
            <option value="">Выберите действие</option>
            <%if('datalink' in obj && datalink){%>
              <option value="go_to_link">Перейти по ссылке</option>
            <%}%>
            <option value="redefine">Переопределить</option>
            <option value="open_in_source">Открыть в источнике</option>
          </select>
          <a href="javascript:;" class="btn btn-primary btn-save" disabled>Ok</a>
          <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
        </div>
      </div>
    </div>
  </div>
</script>


<div class = "breadcrumbs-modal-container" style = ""></div>

<hr class="header-divider" style = "margin: 10px 0px 10px 20px"/>
<div id = "esud" style = "display:none">

        <div class = "maximize">
        <span class = "lnk lnk-collapse" data-val = "min" >развернуть</span>
        <span class = "delimetr">|</span>
        <span class = "lnk lnk-full-screen" data-val = "min">на весь экран</span>
      </div>
      <div class="esud-wrapper">
        <div class="box-row">
          <!--LEFT COMMANDER-->
          <div class="box-cell"  id = "commander1">
            <div class="box commander-box">
              <div class="navbar">
                <div  id = "pnlBriefFilter" class="navbar-inner" style=  "padding-top:10px" >
                  <div class="input-prepend input-append">
                    <span class="add-on"><b class="icon-list-alt"></b></span>
                    <input type="text" class="tb-search"  placeholder="Поиск" />
                    <button type="button" class="btn btn-search" ><i class="icon-search"></i></button>
                  </div>
                  <button type="button" class="btn sort-root" title = "Сортировать по: тип+артикул+наименование" data-val="unsort" style = "float:right; margin-left:4px;" ><i class="fa fa-sort-alpha-asc"></i></button>
                  <button type="button" class="btn expand-root" title = "Расскрыть окно" data-val="expand" style = "float:right; margin-left:4px;" ><i class="fa fa-expand"></i></button>
                  <div class = "control-panel usual-control-panel">
                    <button type="button" class="btn refresh"  title="Обновить" data-val="refresh"><i class="icon-refresh"></i></button>
                    <button type="button" class="btn item-btn remove" title="Удалить" data-val="remove" disabled><i class="icon-trash"></i></button>
                    <button type="button" class="btn item-btn go-to-link" title="Перейти по ссылке" data-val="go-to-link" disabled ><i class="fa fa-external-link"></i></button>
                    <button type="button" class="btn item-btn edit" title="Редактировать" data-val="edit" disabled ><i class="icon-pencil"></i></button>
                    <button style = "display:none;" type="button" class="btn item-btn add" title="Добавить" data-val="add" disabled ><i class="icon-plus"></i></button>
                    <button type="button" class="btn item-btn copy" title="Копировать" data-val="copy" disabled ><i class="fa fa-copy"></i></button>
                    <button type="button" class="btn item-btn move" title="Переместить" data-val="move" disabled >
                      <i class="fa-stack">
                        <i class="fa fa-file-o fa-stack-1x"></i>
                        <i class="fa fa-long-arrow-right fa-stack-1x" style = "margin-left: .4em;"></i>
                      </i>
                    </button>
                    <button type="button" class="btn item-btn link" title="Ярлык" data-val="link" disabled ><i class="fa fa-link"></i></button>
                    <button type="button" class="btn item-btn open-complect" title="Комплектация изделия" data-val="open-complect" disabled><i class="fa fa-file-code-o"></i></button>
                    <button type="button" class="btn item-btn create-product" title="Создать изделие" data-val="create-product" disabled ><i class="fa fa-cogs"></i></button>
                    <button type="button" class="btn add-root" title = "Добавить" data-val="add-root" ><i class="icon-plus"></i></button>
                  </div>
                  <div class = "control-panel search-control-panel" style = "display:none">
                    <button type="button" class="btn exit-search btn-primary" data-val="exit-search"  >Закрыть</button>
                  </div>
                  <div class = "control-panel tree-control-panel" style = "display:none">
                    <button type="button" class="btn tree-refresh"  title="Обновить" data-val="tree-refresh"><i class="icon-refresh"></i></button>
                    <button type="button" class="btn item-btn tree-remove" title="Удалить" data-val="tree-remove" disabled><i class="icon-trash"></i></button>
                    <button type="button" class="btn item-btn tree-specification" title="Спецификация изделия" data-val="tree-specificate"><i class="fa fa-file-text-o"></i></button>
                    <button type="button" class="btn item-btn open-complect" title="Комплектация изделия" data-val="open-complect"><i class="fa fa-file-code-o"></i></button>
                    <button type="button" class="btn item-btn tree-graph" title="Открыть граф изделия" data-val="tree-graph"><i class="fa fa-sitemap fa-rotate-270"></i></button>
                  </div>
                </div>
                <div class = "breadcrumbs-wrapper">
                  <span class = "home-button" title = "Вернуться в начальную папку"><i class="fa fa-home"></i></span>
                  <span class = "back-button" title = "Вернуться на шаг назад"><i class="fa fa-arrow-circle-left"></i></span>
                  <span class = "level-up-button" title = "Подняться на уровень вверх"><i class="fa fa-level-up"></i></span>
                  <span class = "open-in-near-window-button" title = "Дублировать окно в соседнее"><i class="fa fa-columns"></i></span>
                  <span class = "open-path-button" title = "Показать весь путь"><i class="fa fa-asterisk"></i></span>
                  <span class = "undo-history-button" title = "Отменить последнее действие"><i class="fa fa-undo"></i></span>
                  <span class = "redo-history-button" title = "Вернуть последнее действие"><i class="fa fa-undo fa-flip-horizontal "></i></span>
                  <span class = "edit-path-button" title = "Редактировать путь"><i class="fa fa-pencil-square-o"></i></span>
                  <span class = "close-search-button" style = "display:none;"><i class="icon-remove"></i></span>
                  <div class = "breadcrumbs-modal-container" style = ""></div>
                  <div class = "breadcrumbs-edit-container" style = "display:none; padding-top:3px">
                    <div class="input-prepend input-append">
                      <input type="text" class="tb-path-id"  placeholder="ID объекта" style = "width:300px;"/>
                      <button type="button" class="btn btn-open-path" ><i class="icon-search"></i></button>
                    </div>
                  </div>
                  <div class = "breadcrumbs-container">
                    <div class = "breadcrumbs-box">
                      <ul class="breadcrumb"></ul>
                    </div>
                  </div>
                </div>
                <div class = "cur-item-info-box"></div>
              </div>
              <!--BASE VIEW DATA BOX-->
              <div class = "esud-data-container" >
                <!--<table class="table display directory-table-header">
                  <thead>
                    <th class = "name" style = "width:80%">Название</th>
                    <th class = "type" style = "width:20%">Тип</th>
                  </thead>
                </table>-->
                <div class = "esud-data">
                </div>
              </div>
              <!--TREE VIEW DATA BOX-->
              <div class = "esud-data-tree-container" style = "display:none">
                <div class = "directory-tree-header-container">
                  <div class = "directory-tree-header-wrapper">
                    <table class="table display directory-tree-header">
                      <thead>
                        <th class = "name">Название</th>
                        <th class = "value">Значение</th>
                        <th class = "unit">Ед. изм</th>
                        <th class = "type" style = "display:none">Тип</th>
                      </thead>
                    </table>
                  </div>
                </div>
                <div class = "tree-data"></div>
              </div>
              <!--SEARCH BOX-->
              <div class = "search-data-container" style = "display:none">
                <table class="table display search-table-header">
                  <thead>
                    <th class = "name">Название</th>
                    <th class = "type" style = "display:none;">Тип</th>
                    <th class = "path">Путь</th>
                  </thead>
                </table>
                <div class = "search-data">
                </div>
              </div>
            </div>
          </div>
          <!--RIGHT COMMANDER-->
          <div class="box-cell" id = "commander2">
            <div class="box commander-box" >
               <div class="navbar">
                <div  id = "pnlBriefFilter" class="navbar-inner" style=  "padding-top:10px" >
                  <div class="input-prepend input-append">
                    <span class="add-on"><b class="icon-list-alt"></b></span>
                    <input type="text" class="tb-search"  placeholder="Поиск" />
                    <button type="button" class="btn btn-search" ><i class="icon-search"></i></button>
                  </div>
                  <button type="button" class="btn sort-root" title = "Сортировать по: тип+артикул+наименование" data-val="unsort" style = "float:right; margin-left:4px;" ><i class="fa fa-sort-alpha-asc"></i></button>
                  <button type="button" class="btn expand-root" title = "Расскрыть окно" data-val="expand" style = "float:right; margin-left:4px;" ><i class="fa fa-expand"></i></button>
                   <div class = "control-panel usual-control-panel">
                    <button type="button" class="btn refresh"  title="Обновить" data-val="refresh"><i class="icon-refresh"></i></button>
                    <button type="button" class="btn item-btn remove" title="Удалить" data-val="remove" disabled><i class="icon-trash"></i></button>
                    <button type="button" class="btn item-btn go-to-link" title="Перейти по ссылке" data-val="go-to-link" disabled ><i class="fa fa-external-link"></i></button>
                    <button type="button" class="btn item-btn edit" title="Редактировать" data-val="edit" disabled ><i class="icon-pencil"></i></button>
                    <button style = "display:none;" type="button" class="btn item-btn add" title="Добавить" data-val="add" disabled ><i class="icon-plus"></i></button>
                    <button type="button" class="btn item-btn copy" title="Копировать" data-val="copy" disabled ><i class="fa fa-copy"></i></button>
                    <button type="button" class="btn item-btn move" title="Переместить" data-val="move" disabled >
                      <i class="fa-stack">
                        <i class="fa fa-file-o fa-stack-1x"></i>
                        <i class="fa fa-long-arrow-right fa-stack-1x" style = "margin-left: .4em;"></i>
                      </i>
                    </button>
                    <button type="button" class="btn item-btn link" title="Ярлык" data-val="link" disabled ><i class="fa fa-link"></i></button>
                    <button type="button" class="btn item-btn open-complect" title="Комплектация изделия" data-val="open-complect" disabled><i class="fa fa-file-code-o"></i></button>
                    <button type="button" class="btn item-btn create-product" title="Создать изделие" data-val="create-product" disabled ><i class="fa fa-cogs"></i></button>
                    <button type="button" class="btn add-root" title = "Добавить" data-val="add-root" ><i class="icon-plus"></i></button>
                  </div>
                  <div class = "control-panel search-control-panel" style = "display:none">
                    <button type="button" class="btn exit-search btn-primary" data-val="exit-search"  >Закрыть</button>
                  </div>
                  <div class = "control-panel tree-control-panel" style = "display:none">
                    <button type="button" class="btn tree-refresh"  title="Обновить" data-val="tree-refresh"><i class="icon-refresh"></i></button>
                    <button type="button" class="btn item-btn tree-remove" title="Удалить" data-val="tree-remove" disabled><i class="icon-trash"></i></button>
                    <button type="button" class="btn item-btn tree-specification" title="Спецификация изделия" data-val="tree-specificate"><i class="fa fa-file-text-o"></i></button>
                    <button type="button" class="btn item-btn open-complect" title="Комплектация изделия" data-val="open-complect"><i class="fa fa-file-code-o"></i></button>
                    <button type="button" class="btn item-btn tree-graph" title="Открыть граф изделия" data-val="tree-graph"><i class="fa fa-sitemap fa-rotate-270"></i></button>
                  </div>
                </div>
                 <div class = "breadcrumbs-wrapper">
                  <span class = "home-button" title = "Вернуться в начальную папку"><i class="fa fa-home"></i></span>
                  <span class = "back-button" title = "Вернуться на шаг назад"><i class="fa fa-arrow-circle-left"></i></span>
                  <span class = "level-up-button" title = "Подняться на уровень вверх"><i class="fa fa-level-up"></i></span>
                  <span class = "open-in-near-window-button" title = "Дублировать окно в соседнее"><i class="fa fa-columns"></i></span>
                  <span class = "open-path-button" title = "Показать весь путь"><i class="fa fa-asterisk"></i></span>
                  <span class = "undo-history-button" title = "Отменить последнее действие"><i class="fa fa-undo"></i></span>
                  <span class = "redo-history-button" title = "Вернуть последнее действие"><i class="fa fa-undo fa-flip-horizontal "></i></span>
                  <span class = "edit-path-button" title = "Редактировать путь"><i class="fa fa-pencil-square-o"></i></span>
                  <span class = "close-search-button" style = "display:none;"><i class="icon-remove"></i></span>
                  <div class = "breadcrumbs-modal-container" style = ""></div>
                   <div class = "breadcrumbs-edit-container" style = "display:none; padding-top:3px">
                    <div class="input-prepend input-append">
                      <input type="text" class="tb-path-id"  placeholder="ID объекта" style = "width:300px;"/>
                      <button type="button" class="btn btn-open-path" ><i class="icon-search"></i></button>
                    </div>
                  </div>
                  <div class = "breadcrumbs-container">
                    <div class = "breadcrumbs-box">
                      <ul class="breadcrumb"></ul>
                    </div>
                  </div>
                </div>
                <div class = "cur-item-info-box"></div>
              </div>
              <!--DATA BOX-->
              <div class = "esud-data-container">
                <!--<table class="table display directory-table-header">
                  <thead>
                    <th class = "name" style = "width:80%">Название</th>
                    <th class = "type" style = "width:20%">Тип</th>
                  </thead>
                </table>-->
                <div class = "esud-data">
                </div>
              </div>
              <!--TREE VIEW DATA BOX-->
              <div class = "esud-data-tree-container" style = "display:none">
                <div class = "directory-tree-header-container">
                  <div class = "directory-tree-header-wrapper">
                    <table class="table display directory-tree-header">
                      <thead>
                        <th class = "name">Название</th>
                        <th class = "value">Значение</th>
                        <th class = "unit">Ед. изм</th>
                        <th class = "type" style = "display:none">Тип</th>
                      </thead>
                    </table>
                  </div>
                </div>
                <div class = "tree-data"></div>
              </div>
              <!--SEARCH BOX-->
              <div class = "search-data-container" style = "display:none">
                <table class="table display search-table-header">
                  <thead>
                    <th class = "name">Название</th>
                    <th class = "type" style = "display:none;">Тип</th>
                    <th class = "path">Путь</th>
                  </thead>
                </table>
                <div class = "search-data">
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
</div>
