%def scripts():
  <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/esudspecification.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/controls/techno_map.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
  <link href="/static/css/jquery.treetable.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />

  <script src="/static/scripts/esudspecification/app.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/model_item.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_data.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_specification.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_productinfo.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_controlpanel.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_datapanel.js?v={{version}}"></script>
  <script src="/static/scripts/user_controls/queue.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/specification_list.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/specification_history.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_pager.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_filter_box.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification/view_filter_model_properties.js?v={{version}}"></script>
  <script src="/frontend/shift_task/scripts/plan/techno_map_view.js?v={{version}}"></script>
  <script src="/static/scripts/esudspecification_calculation/view_data.js?v={{version}}"></script>

  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/base64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/b64.js?v={{version}}"></script>
  <script src="/static/scripts/libs/rawdeflate.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.dataTables-1.10.0.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.treetable.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script>
    $(function() {
        $.ajaxSetup({timeout:50000});
        bootbox.setDefaults({locale: "ru"});
         App.initialize( {{! system_objects }}, {{!data_models}} );
         $("#esud_specification").show();
    });
  </script>
%end
%rebase master_page/base_lastic page_title='ЭСУД. Спецификация', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data, data_models = data_models

<!--Шаблон отображения технологической карты-->
%include esud/techno_map_template

<!--Шаблоны отображения расчетов по спецификации-->
%include esud/specification_calculation/buy_items_template
%include esud/specification_calculation/own_items_template
%include esud/specification_calculation/plan_norms_template
%include esud/specification_calculation/side_object_template

<style>
  .tree-data {
    position:initial!important;
  }
  .tb-spec-number {
    width:100px;
  }
  .left-side{
    flex: 1 0 25%;
    box-sizing: border-box;
    padding-right:20px;
    min-width: 440px;
  }
  .right-side {
    flex: 1 1 75%;
    position:relative;
    overflow:hidden;
  }
  .tree-data {
    padding:0px!important;
  }
</style>

<!--PRODUCT INFORMATION TEMPLATE-->
<script id="productItemInfoTemplate" type="text/template">
  <% if(obj){
      var p1 = "";
      var p2="";
      var unique_props_str = "";
      for(var i in obj.properties) {
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
          p1 = obj.properties[i].values[0].value.value;
      }
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
        p2 = obj.properties[i].values[0].value.value;
      }
   }} %>
  <a href="/esud#c1__go__<%=_id%>&c1__activate__true&c1__highlight__&c2__go__&c2__activate__false&c2__highlight__" title = "перейти к продукции"><%=(obj && 'number' in obj && number)?number+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></a><a style = "margin-left:5px;"class = "icon-link" title = "Открыть граф" href = "/esud/esudtreegraph#root=<%=_id%>" target="_blank"><i class="fa fa-sitemap fa-rotate-270"></i></a>
</script>
<script id="specificationItemInfoTemplate" type="text/template">
  <% if(obj){
      var p1 = "";
      var p2="";
      var unique_props_str = "";
      for(var i in obj.properties) {
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR1_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
          p1 = obj.properties[i].values[0].value.value;
      }
      if((obj.properties[i].property_origin_id || obj.properties[i].property_id)==App.SystemObjects['items']['SHIFR2_PROP'] && obj.properties[i].configuration_path=="" && obj.properties[i].values && obj.properties[i].values.length>0) {
        p2 = obj.properties[i].values[0].value.value;
      }
   }} %>
  <a href="/esud#c1__go__<%=config_id%>&c1__activate__true&c1__highlight__&c2__go__&c2__activate__false&c2__highlight__" title = "перейти к продукции"><%=(obj && 'number' in obj && number)?number+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=name%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %></a><a style = "margin-left:5px;"class = "icon-link" title = "Открыть граф" href = "/esud/specification/graph#root=<%=_id%>" target="_blank"><i class="fa fa-sitemap fa-rotate-270"></i></a>
</script>
<!--DIRECTORY TREE VIEW TEMPLATES-->
<script id="directoryTreeTemplate" type="text/template">
  <table class="table treetable">
    <tbody>
    </tbody>
  </table>
</script>
<!--product-->
<script id="itemProductTreeTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name">
      <input type="checkbox" class = "cb-config" style = "<%=(!is_config || !enabled)?'display:none':''%>" <%= checked?"checked":"" %> <%=enabled?'':'disabled'%> />
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name %><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+(obj.is_modified?' (мод.)':'')+']</span>':''%>
      </span>
    </td>
    <td class="value <%=formula_error?'lbl-error':'' %>" title = "<%=value && formula?formula:'' %>">
        <%=(value)?(formula_error)?formula_error:((Routine.isDiggit(value))?Routine.addCommas(Routine.strToFloat(value).toFixed(4).toString()," "):value):'-'%>
    </td>
    <td class="unit"><%= unit %></td>
    <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false); %>
    <td class = "type" title= "<%=decodedType['type'] %>">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>
<!--model-->
<script id="itemModelTreeTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name">
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name %><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+(obj.is_modified?' (мод.)':'')+']</span>':''%><%=('error_msg' in obj && error_msg)?('&nbsp;<span class = "lbl-error">[' +error_msg+']</span>&nbsp;'):''%>
      </span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>
    <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false); %>
    <td class = "type" title= "<%=decodedType['type'] %>">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>
<!--group model-->
<script id="itemGroupModelTreeTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name">
      <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name %><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+']</span>':''%><%=('error_msg' in obj && error_msg)?('&nbsp;<span class = "lbl-error">[' +error_msg+']</span>&nbsp;'):''%>
      </span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>
    <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false); %>
    <td class = "type" title= "<%=decodedType['type'] %>">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>


<!--propperty-->
<script id="itemTreePropTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" data-tt-parent-id="<%= parent_index %>"  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name">
      <span class="name"><%= name %></span>
    </td>
    <%if(is_editable){%>
      <td class="value <%=((value && value['is_open'])?'custom-value':'')%>">
         <select class="value-val">
          <%if(values && values.length>1){%>
            <option value = "" data-name="" data-id="" data-datalink="" ></option>
          <%} if(values && values.length>0){
            for(var i in values)
            {
              value_name = values[i]['name'];
              if(values[i]['is_inherit'])
              {
                if(values[i]['inherited_value'] &&values[i]['inherited_value']['value'])
                  value_name+=' '+values[i]['inherited_value']['value'];
                else
                  value_name+=' Не определено';
              }%>
              <option value = "<%=values[i]['value']%>" data-name="<%=values[i]['value']%>" data-id="<%=values[i]['_id']%>" data-datalink="<%=values[i]['datalink']%>" <%=((value && values[i]['_id'] == value['_id'])?'selected':'')%> ><%=value_name%></option>
            <%}}%>
        </select>
        <!--<i class="fa fa-facebook"></i>-->
        <input type="text"  title = "<%=value && value['formula']?value['formula']:'' %>" class="additional-value" value="<%=((value && value['is_open'] && value['value']!='(Открытое значение)')?(value['formula_error'])?value['formula_error']:value['value']:'')%>" style = "display:<%=(( value && value['is_open'] )?'':'none')%>" />
      </td>

      <%if(value && value['unit'] && (!value['units'] || value['units'].length==0)){%>
        <td class="unit"><%=  ((value && value['unit'])?value['unit']['name']:'') %></td>
      <%} else if(value && value['units'] && value['units'].length>0){
          var tmp_sel_unit = null;
          for(var i in value['units'])
            if(value['unit'] && value['units'][i]['name'] == value['unit']['name'])
            {
              tmp_sel_unit = value['units'][i];
              break;
            }%>
        <td class="unit">

          <select class="unit-val" style = "width: <%= (tmp_sel_unit && tmp_sel_unit['unit'])? '50%':'100%' %>">
              <%if(value['units'].length>1){%>
                <option value = "" data-name="" data-id="" data-datalink="" ></option>
              <%} if(value['units'].length>0){
                for(var i in value['units'])
                {%>
                  <option value = "<%=value['units'][i]['name']%>" data-name="<%=value['units'][i]['name']%>" data-id="<%=value['units'][i]['_id']%>" data-datalink="<%=value['units'][i]['datalink']%>" <%=((value['unit'] && value['units'][i]['name'] == value['unit']['name'])?'selected':'')%>><%=value['units'][i]['name']%>
                  </option>
                <%}}%>
          </select>
          <%= tmp_sel_unit && tmp_sel_unit['unit']?(' / '+tmp_sel_unit['unit']['name']):'' %>
        </td>
      <%} else{%>
        <td class="unit"></td>
      <%}%>
    <%}else{%>
      <td class="value" title = "<%=value && value['formula']?value['formula']:'' %>">
        <%= ((value)? (value['formula_error'])?value['formula_error']:value['value']:'')%>
      </td>
      <td class="unit"><%= ((value && value['unit'])?value['unit']['name']:'') %><%= ((value && value['unit'] && value['unit']['unit'] )?' / '+value['unit']['unit']['name']:'') %></td>
    <%}%>
    <%var decodedType =  App.DecodeType(type,false); %>
    <td class = "type" title= "<%=decodedType['type'] %>">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>

<!--SPECIFICATION-->
<script id="itemSpecificationTreeTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name"><span class="name" style = "margin-left:4px"><%=number+'&nbsp;' + name%></span></td>
    <td class="value"><%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):'-'%></td>
    <td class="unit"><%= unit %></td>
    <td class = "type" >
      <%=('is_buy' in node && node['is_buy'])?'ИП':'И' %>
    </td>
  </tr>
</script>

<!--SPECIFICATION PROPERTY-->
<script id="itemTreeSpecificationPropViewTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" data-tt-parent-id="<%= parent_index %>"  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name"><span class="name" style = "margin-left:3px"><%= name %></span></td>
    <td class="value"><%= value%></td>
    <td class="unit"><%= unit %><%= (sub_unit)?' / ' + sub_unit:'' %></td>
    <td class = "type" >С</td>
  </tr>
</script>

<!--NO DATA-->
<script id="itemNoData" type="text/template">
  <tr >
    <td colspan = "4">Нет данных</td>
  </tr>
</script>


<!--PROCESS-->
<script id="itemProcessTreeTemplate" type="text/template">
  <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
    <td class="name">
      <span class="name"><%=name%></span>
    </td>
    <td class="value"></td>
    <td class="unit"></td>
    <%var decodedType =  App.DecodeType(type,false); %>
    <td class = "type" title= "<%=decodedType['type'] %>">
      <%=decodedType['short_type'] %>
    </td>
  </tr>
</script>

<!--=========SPECIFICATION LIST=====================-->
<script id="listSpecificationItemTemplate" type="text/template">
  <td>
    <a href = "/esud/specification#number/<%=number%>/tab/2/optional/true"><%=number%></a>
    <a style = "margin-left:5px;"class = "icon-link" title = "Открыть граф" href = "/esud/specification/graph#root=<%=_id%>" target="_blank"><i class="fa fa-sitemap fa-rotate-270"></i></a>
  <td><%=name%></td>
  <td><%=unique_props %></td>
  <td><%=tech_props %></td>
  <td><%=Routine.rNToBr(note) %></td>
  <td><%=date_add%></td>
  <td><%=user_add%></td>
  <td style = "white-space:nowrap; text-align:center">
    <input type = "text" class = "tb tb-to-calculate-val" style = "width:20px" data-number= "<%=number%>" <%=is_buy?'disabled':''%> value="<%=volume_to_calculate%>"  />&nbsp;
    <span style = "display:none" class="lnk" style = "font-size:16px;"><i class="fa fa-shopping-cart" aria-hidden="true"></i></span>
  </td>
</script>
<!--================================================-->

<!--=========ИСТОРИЯ=====================-->
<script id="specificationHistoryItemTemplate" type="text/template">
  <td><%=date%></td>
  <td><%=user %></td>
  <td><%=Routine.rNToBr(note)%></td>
</script>
<!--================================================-->

<!--=========PAGER=====================-->
<script type="text/template" id="pagerTemplate">
  <div class="list-pager" style = "<%=(count>1)?'':'display:none'%>">
  <% var start = cur_page-5;
     if (start<1) start = 1;
     var end = start+10;
     if(end>count)
      end = count;%>
    <% if(start>1) { %><span class="over">...</span><% } %>
    <% for(var i=start;i<=end;++i) {%>
    <% if(i==cur_page) {%>
      <span class="cur"><%= i %></span>
    <% } else {%>
      <a data-page="<%= i %>"><%=i %></a>
    <% } %>
    <%}%>
    <% if(end<count) { %><span class="over">...</span><% } %>
  </div>
</script>

<!--=========FILTERS=====================-->
<script id="filterPropertyItemTemplate" type="text/template">
  <div class="accordion-heading">
    <a class="accordion-toggle collapsed" data-toggle="collapse" data-parent="#accordion2" href="#<%=_id%>">
      <span class="pull-right"><i class="icon-chevron-down"></i></span>
      <%=name%>
    </a>
  </div>
  <div id="<%=_id%>" class="accordion-body collapse">
    <div>
      <div class="accordion-inner">
          <ul class = "pnl-prop-values"></ul>
      </div>
    </div>
  </div>
</script>
<script id="filterValueItemTemplate" type="text/template">
  <label class="checkbox"><input type="checkbox" class="cb-val" <%= selected?"checked":'' %> />
    <% if(is_open){%>
      <input type = "text" class = "tb tb-open-val" value = "<%=((value!='(Открытое значение)')?value:'') %>" />
    <%} else {%>
      <%=name%>
    <%}%>
  </label>
</script>

<div id="esud_specification" style = "display:none">
  <div  class="esud-specification-wrapper wrap">
    <!--LEFT SIDE-->
    <div class = "left-side">
      <div class="navbar" id="navigationButtons">
        <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px; min-height:50px; ">
          <div class = "line">
            <div class="input-prepend input-append full-view simple-view" style = "float:left">
                  <span class="add-on"><b class="fa fa-file-text-o"></b>&nbsp;Спецификация:</span>
                  <input type="text" class="tb-spec-number"  placeholder="артикул" />
                  <button class="btn btn-success btn-open-specification" id = "btn_open_specification"  >Открыть</button>
            </div>

            <!-- Панель фильтрации данных по моделям и их свойствам-->
            <div class = "pnl-search simple-view" style = "display:none" id = "pnlFilterBox">
              <span class = "font16 bold">Подбор спецификаций:</span><br/>
              <span class = "font12 color-lightgrey">Задайте критерии поиска спецификаций.</span><br/><br/>
              <!-- buy/own-->
               <div class='line' style='margin:3px 0px 3px 0px;'>
                  <select class="ddl ddl-product-type" style = 'width:200px;''>
                    <option value = "">Все изделия</option>
                    <option value = "own" selected>Собственные изделия</option>
                    <option value = "buy">Покупные изделия</option>
                  </select>
               </div>
              <!-- child models-->
              <div class='line pnl-ddl-models' style='margin:3px 0px 3px 0px;'>
                  <select class="ddl-models"   style = "display:none">
                  </select>
              </div>
              <div class='line pnl-model-properties' style='margin:15px 0px 3px 0px;' id = "pnl_filter_model_properties"></div>
              <!-- parent models-->
              <div class = "line pnl-filter-parent-models" style = "display:none; margin-top:20px;">
                <div class='line pnl-ddl-parent-models' style='margin:3px 0px 3px 0px;'>
                    <select class="ddl-parent-models" ></select>
                </div>
                <div class='line pnl-parent-model-properties' style='margin:15px 0px 3px 0px;' id = "pnl_filter_parent_model_properties"></div>
              </div>
              <div class='line' style='margin:15px 0px 3px 0px;'>
                <button class="btn btn-success btn-find-specification" id = "btn_find_specification"  >Показать</button>
              </div>
            </div>
            <!--МЕНЮ табов-->
            <ul class="nav nav-tabs full-view nav-own-tabs" style = "font-size:12px; margin-top:20px;">
                <li><a href="#tab-view-specification" data-toggle="tab" data-number="2">Структура</a></li>
                <!--<li class="active"><a href="#tab-make-specification" data-toggle="tab" data-number="1">Редактирование</a></li>-->
                <li><a href="#tab-view-parents" data-toggle="tab" data-number="3">Куда входит</a></li>
                <li><a href="#tab-view-calculation" data-toggle="tab" data-number="4">Расчеты</a></li>
                <li><a href="#tab-view-history" data-toggle="tab" data-number="5">История</a></li>
            </ul>

            <div class = "input-prepend full-view" style = "margin-top:20px;">
                <div class="input-prepend input-append" style = "margin:2px 20px 0px 0px;">
                  <label class="checkbox"><input type="checkbox" id="cb-only-options" checked />только опции</label>
                </div>
                <button value = "unCollapsed"  class="btn btn-collapse" style = "margin:0px 0px 3px 0px;"><i class="fa fa-folder-open"></i>&nbsp;&nbsp;Закрыть группы</button>
            </div>
            <div class="input-prepend input-append full-view edit-view pnl-specification-name"  style = "margin-top:15px; display:none">
              <span class = "font16 bold">Название:</span><br/>
              <input type = "text" class = "tb tb-specification-name" style = "width:370px" />
            </div>
            <div class = "line pnl-note full-view " style = "margin-top:20px; display:none">
              <span class = "font16 bold">Примечение:</span><br/>
              <span class = "font12 color-lightgrey">Укажите только самую важную информацию: основные отличительные особенности спецификации и т.п.</span><br/>
              <textarea class="span5 tb-note" rows="3"></textarea>
            </div>
            <div class="input-prepend input-append full-view edit-view"  style = "margin-top:20px; display:none">
                  <select class="ddl ddl-save-type" style = "display:none; width:200px;">
                    <option value = "">Выберите способ сохранения</option>
                    <option value = "edit">Перезаписать текущую спецификацию</option>
                    <option value = "new">Сохранить с новым артикулом</option>
                  </select>
                  <button  class="btn btn-save-specification" disabled style = "margin:0px 0px 3px 0px;">
                    <i class="fa fa-save"></i>&nbsp;&nbsp;Сохранить
                  </button>
            </div>
            <div class="input-prepend input-append full-view1"  style = "margin-top:20px; display:none;">
              <button  class="btn btn-calculate-specification" style = "margin:0px 0px 3px 0px; display:none;">
                <i class="fa fa-calculator"></i>&nbsp;&nbsp;Расчитать
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
    <!--======-->

    <!-- RIGHT SIDE-->
    <div class = "right-side">
      <!--Product Info-->
      <div  id = "product_info" class = "pnl-product-info">
        <div class = "left"></div>
        <div class = "right" style = "display:none">
          <button class="btn btn-success btn-edit-specification" >Редактировать</button>
          <button class="btn btn-success btn-calculate-specification" ><i class="fa fa-calculator"></i>&nbsp;&nbsp;Расчитать</button>
        </div>
      </div>

      <!--=======Форма работы со спецификацией========================-->
      <div id = "esud_specification_body" class="data-body" style = "display:none; margin-top:20px;">
          <div class="tabbable">
            <div class="tab-content">
                <!-- форма редактирования спецификации-->
                <div class="tab-pane active" id="tab-make-specification">
                    <div class = "line data-container "  id = "esud_specification_builder">
                       <div class = "esud-data-tree-container">
                          <div class = "directory-tree-header-container">
                            <div class = "directory-tree-header-wrapper">
                              <table class="table display directory-tree-header">
                                <thead>
                                  <th class = "name">Название</th>
                                  <th class = "value">Значение</th>
                                  <th class = "unit">Ед. изм</th>
                                  <th class = "type">Тип</th>
                                </thead>
                              </table>
                            </div>
                          </div>
                          <div class = "tree-data">
                          </div>
                        </div>
                    </div>
                </div>
                <!-- форма просмотра спецификации-->
                <div class="tab-pane" id="tab-view-specification">
                    <div class = "line data-container"  id = "esud_specification_view">
                         <div class = "esud-data-tree-container">
                          <div class = "directory-tree-header-container">
                            <div class = "directory-tree-header-wrapper">
                              <table class="table display directory-tree-header">
                                <thead>
                                  <th class = "name">Название</th>
                                  <th class = "value">Значение</th>
                                  <th class = "unit">Ед. изм</th>
                                  <th class = "unit">Ед. изм</th>
                                  <th class = "type">Тип</th>
                                </thead>
                              </table>
                            </div>
                          </div>
                          <div class = "tree-data">
                          </div>
                        </div>
                    </div>
                </div>
                <!-- форма списка спецификаций, в которую входит текущая-->
                <div class="tab-pane" id="tab-view-parents">
                    <div class = "line" style = "margin-top:20px">
                      <span class = "lbl font18" >Куда входит</span>
                    </div>
                    <div class = "line data-container"  style = "margin-top:10px;">
                       <table class = 'in-info'>
                        <thead>
                          <tr>
                            <td style = "width:8%">Артикул</td>
                            <td style = "width:20%">Название</td>
                            <td style = "width:15%">Инд. х-ки</td>
                            <td style = "width:14%">Тех. св-ва</td>
                            <td style = "width:20%">Примечание</td>
                            <td style = "width:8%">Дата создания</td>
                            <td style = "width:10%">Создал</td>
                            <td style = "width:5%">
                              <label class="checkbox" title = "Количество в расчет">
                                <input type="checkbox" id="cb-show-to-calculate" style = "margin:3px 0px 0px 0px;" />
                              </label>
                            </td>
                          </tr>
                        </thead>
                        <tbody class = "spec-data-list"></tbody>
                        <tfoot>
                          <tr>
                            <td colspan = "7" style = "text-align:right">
                              <button class="btn btn-success btn-calculate-specifications" id = "btn_calculate_specifications"><i class="fa fa-calculator"></i>&nbsp;&nbsp;Расчитать</button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div class = "line specification-list-pager" ></div>
                </div>
                <!-- Форма отображения расчетов по спецификации-->
                <div class="tab-pane" id="tab-view-calculation">
                    <ul class="nav nav-tabs nav-calculation" style = "font-size:12px; margin-top:10px;">
                        <li class="active"><a href="#tab-view-techno-map" data-toggle="tab">Технологическая карта</a></li>
                        <li><a href="#tab-view-buy-items" data-toggle="tab">Изделия покупные</a></li>
                        <li><a href="#tab-view-own-items" data-toggle="tab" >Задание на производство</a></li>
                    </ul>
                    <div class="tabbable">
                      <div class="tab-content">
                        <div class="tab-pane active" id="tab-view-techno-map">
                          <div class = "maximize">
                            <span class = "lnk lnk-collapse" data-val = "min" >развернуть</span>
                            <span class = "delimetr">|</span>
                            <span class = "lnk lnk-full-screen" data-val = "min">на весь экран</span>
                          </div>
                          <div class = "line data-container" id = "techno_map_data_container"  style = "margin-top:15px;">
                            загрузка...
                          </div>
                        </div>
                        <div class="tab-pane" id="tab-view-buy-items">
                          <div class = "line data-container" id = "esud_calculation_data_container"  style = "margin-top:10px; font-size:10px;">
                            загрузка...
                          </div>
                        </div>
                        <div class="tab-pane" id="tab-view-own-items">
                          <div class = "line data-container" id = "esud_task_to_product_data_container" style = "margin-top:10px; font-size:10px;">
                            загрузка...
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                <!-- Форма отображения истории изменения по спецификации-->
                <div class="tab-pane" id="tab-view-history">
                    <div class = "line" style = "margin-top:20px">
                      <span class = "lbl font18" >История изменений</span>
                    </div>
                    <div class = "line data-container"  style = "margin-top:10px;">
                       <table class = 'in-info'>
                        <thead>
                          <tr>
                            <td style = "width:15%">Дата</td>
                            <td style = "width:20%">Пользователь</td>
                            <td style = "width:65%">Примечание</td>
                          </tr>
                        </thead>
                        <tbody class = "data-list"></tbody>
                      </table>
                    </div>
                </div>
            </div>
          </div>
      </div>
      <!--============================================================-->
      <!--=======Форма работы со списокм спецификаций===============-->
        <div class="tab-pane" id="tab-view-specification-list-container" style = "display:none">
          <ul class="nav nav-tabs" style = "font-size:12px; margin-top:10px;">
              <li class="active"><a href="#tab-view-specification-list" data-toggle="tab">Спецификации</a></li>
              <li><a href="#tab-view-specifications-to-calculate" data-toggle="tab">Спецификации в расчет</a></li>
          </ul>
          <div class="tabbable">
            <div class="tab-content">
              <div class="tab-pane active" id="tab-view-specification-list">
                  <div id = "esud_specification_list_body" class="data-list-body">
                    <div class = "line data-container" >
                       <table class = 'in-info'>
                        <thead>
                          <tr>
                            <td style = "width:8%">Артикул</td>
                            <td style = "width:20%">Название</td>
                            <td style = "width:15%">Инд. х-ки</td>
                            <td style = "width:14%">Тех. св-ва</td>
                            <td style = "width:20%">Примечание</td>
                            <td style = "width:8%">Дата создания</td>
                            <td style = "width:10%">Создал</td>
                            <td style = "width:5%">
                              <label class="checkbox" title = "Количество в расчет">
                                <input type="checkbox" id="cb-show-to-calculate" style = "margin:3px 0px 0px 0px;" />
                              </label>
                            </td>
                          </tr>
                        </thead>
                        <tbody class = "spec-data-list"></tbody>
                        <tfoot style = "display:none">
                          <tr>
                            <td colspan = "7" style = "text-align:right">
                              <button class="btn btn-success btn-calculate-specifications" id = "btn_calculate_specifications"  >Расчитать</button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <div class = "line specification-list-pager" id = "specification-list-pager">
                    </div>
                  </div>
              </div>
              <div class="tab-pane" id="tab-view-specifications-to-calculate">

                <div id = "esud_specification_list_to_calcualte_body" class="data-list-to-calculate-body">
                  <div class = "line data-container" >
                      <table class = 'in-info'>
                        <thead>
                          <tr>
                             <td style = "width:8%">Артикул</td>
                            <td style = "width:20%">Название</td>
                            <td style = "width:15%">Инд. х-ки</td>
                            <td style = "width:14%">Тех. св-ва</td>
                            <td style = "width:20%">Примечание</td>
                            <td style = "width:8%">Дата создания</td>
                            <td style = "width:10%">Создал</td>
                            <td style = "width:5%">
                              <label class="checkbox" title = "Количество в расчет">
                                <input type="checkbox" id="cb-show-to-calculate" style = "margin:3px 0px 0px 0px;" />
                              </label>

                            </td>
                          </tr>
                        </thead>
                        <tbody class = "spec-data-list"></tbody>
                        <tfoot>
                          <tr>
                            <td colspan = "7" style = "text-align:right">
                              <button class="btn btn-success btn-calculate-specifications" id = "btn_calculate_specifications"  >Расчитать</button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
         </div>
      <!--============================================================-->
    </div>
  </div>
</div>
