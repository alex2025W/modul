%def scripts():
    <link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/esudcomplect.css?v={{version}}" rel="stylesheet" media="screen">
    <link href="/static/css/font-awesome.min.css?v={{version}}" rel="stylesheet">
    <link href="/static/css/jquery.treetable.css?v={{version}}" rel="stylesheet" media="screen">
    <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
    <script src="/static/scripts/esudcomplect/app.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/model_item.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_data.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_complect.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_modelinfo.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_controlpanel.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_datapanel.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/complect_list.js?v={{version}}"></script>
    <script src="/static/scripts/user_controls/queue.js?v={{version}}"></script>
    <script src="/static/scripts/esudcomplect/view_pager.js?v={{version}}"></script>
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

    <script>$(function() {
            $.ajaxSetup({timeout:50000});
            bootbox.setDefaults({locale: "ru"});
            App.initialize({{! system_objects }});
             $("#esud_complect").show();
        });
    </script>
%end
%rebase master_page/base_lastic page_title='ЭСУД. Комплекты', current_user=current_user, version=version, scripts=scripts,menu=menu, data=data

<style>
    .tree-data {
        position:initial!important;
    }
    .tb-spec-number
    {
        width:100px;
    }
    .left-side{
        flex: 1 0 25%;
        box-sizing: border-box;
        padding-right:20px;
        min-width: 440px;
    }
    .right-side{
        flex: 1 1 75%;
        position:relative;
    }
    .tree-data{
        padding:0px!important;
    }
</style>

<!--MODEL INFORMATION TEMPLATE-->
<script id="configItemInfoTemplate" type="text/template">
    <a href="/esud#c1__go__<%=_id%>&c1__activate__true&c1__highlight__&c2__go__&c2__activate__false&c2__highlight__" title = "перейти к источнику"><%=(obj && 'number' in obj && number)?number+'&nbsp;':''%><%=name%></a>
</script>
<!--DIRECTORY TREE VIEW TEMPLATES-->
<script id="directoryTreeTemplate" type="text/template">
    <table class="table treetable"><tbody></tbody></table>
</script>
<!--product-->
<script id="itemProductTreeTemplate" type="text/template">
    <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>"  data-is_clone = <%=is_clone%>>
        <td class="name">
            <input type="checkbox" class = 'cb-config' style = "<%=(!is_config || !enabled)?'display:none':''%>" <%= checked?"checked":"" %> <%=enabled?'':'disabled'%> />

            <% if(volume_is_optional){%>
            <% if(is_clone) {%>
                <a class = "remove-clone" title="Удалить клон конфигурации" ><i class="fa fa-trash-o"></i></a>
            <%} else {%>
                <a class = "add-clone" title="Клонировать конфигурацию" ><i class="fa fa-clone"></i></a>
            <%}%>
            <%}%>

            <span class="name <%=(('is_system' in node && node['is_system']) || (('is_objective_system' in node && node['is_objective_system'])))?'system':''%>"><%= 'number' in obj && number?number+'&nbsp;':'' %><%=('sub_name_before' in obj && sub_name_before)?('<span class = "lbl-light">[' +sub_name_before+']</span>&nbsp;'):''%><%= name %><%=('sub_name' in obj && sub_name)?'&nbsp;<span class = "lbl-light">[' +sub_name+(obj.is_modified?' (мод.)':'')+']</span>':''%>
            </span>
        </td>

        <%if(editable_volume){%>
            <td class="value <%=formula_error?'lbl-error':'' %>" title = "<%=value && formula?formula:'' %>">
                <!--<%=(value)?(formula_error)?formula_error:value:'-'%>-->
                <input type="text" class="tb-count" value="<%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):''%>" style = "" />
            </td>
        <%}else{%>
            <td class="value <%=formula_error?'lbl-error':'' %>" title = "<%=value && formula?formula:'' %>">
                <%=(value)?(formula_error)?formula_error:((Routine.isDiggit(value))?Routine.addCommas(Routine.strToFloat(value).toFixed(4).toString()," "):value):'-'%>
            </td>
        <%}%>

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
        <td class="value"><%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):''%></td>
        <td class="unit"><%=unit%></td>
        <%var decodedType =  App.DecodeType(type,('is_buy' in node)?node['is_buy']:false); %>
        <td class = "type" title= "<%=decodedType['type'] %>">
            <%=decodedType['short_type'] %>
        </td>
    </tr>
</script>
<!--group model-->
<script id="itemGroupModelTreeTemplate" type="text/template">
    <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %> data-object-tmp-id="<%= tmp_id %>" >
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
                    <%if(values && values.length>0){%>
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
                <!--<input type="text" class="additional-value" value="<%=((value && value['is_open'] && value['value']!='(Открытое значение)')?value['value']:'')%>" style = "display:<%=(( value && value['is_open'] )?'':'none')%>" />-->
                <input type="text"  title = "<%=value && value['formula']?value['formula']:'' %>" class="additional-value" value="<%=((value && value['is_open'] && value['value']!='(Открытое значение)')?(value['formula_error'])?value['formula_error']:value['value']:'')%>" style = "display:<%=(( value && value['is_open'] )?'':'none')%>" />
            </td>

            <%if(value && value['unit']){%>
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
            <!--<td class="value"><%= ((value)?value['value']:'')%></td>-->
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
    <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %> data-object-tmp-id="<%= tmp_id %>" >
        <td class="name">
            <input type="checkbox" class = 'cb-specification' style = "" <%= checked?"checked":"" %> <%=enabled?'':'disabled'%> />
            <span class="name" style = "margin-left:4px"><%=number+'&nbsp;' + name%></span>
        </td>
        <td class="value">
            <%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):''%>
        </td>
        <td class="unit"><%= unit %></td>
        <td class = "type" ><%=type %></td>
    </tr>
</script>

<!--COMPLECT-->
<script id="itemComplectTreeTemplate" type="text/template">
    <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>  data-object-tmp-id="<%= tmp_id %>" >
        <td class="name"><span class="name" style = "margin-left:4px"><%=number+'&nbsp;' + name%></span></td>
        <td class="value">
            <%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):'-'%>
            <!--<input type="text" class="tb-count" value="<%=(value)?((Routine.isDiggit(value))?Routine.addCommas(value.toFixed(4).toString()," "):value):''%>" style = "" />-->
        </td>
        <td class="unit"><%= unit %></td>
        <td class = "type" >
            <%=('is_buy' in node && node['is_buy'])?'ИП':'И' %>
        </td>
    </tr>
</script>

<!--COMPLECT PROPERTY-->
<script id="itemTreeComplectPropViewTemplate" type="text/template">
    <tr data-tt-id="<%= index %>" data-tt-parent-id="<%= parent_index %>"  data-object-tmp-id="<%= tmp_id %>" >
        <td class="name"><span class="name" style = "margin-left:3px"><%= name %></span></td>
        <td class="value"><%= value%></td>
        <td class="unit"><%= unit %><%= (sub_unit)?' / ' + sub_unit:'' %></td>
        <td class = "type" >С</td>
    </tr>
</script>

<!--NO DATA IN TREE-->
<script id="itemTreeNoData" type="text/template">
    <tr data-tt-id="<%= index %>" <% if(parent_index) {%> data-tt-parent-id="<%= parent_index %>" <% } %>>
        <td colspan = "4" class = "color-red"><%=((msg)?msg:'Ошибка! Нет данных.')%></td>
    </tr>
</script>

<!--NO DATA-->
<script id="itemNoData" type="text/template">
    <tr><td colspan = "4">Нет данных</td></tr>
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

<!--=========COMPLECT LIST=====================-->
<script id="listComplectItemTemplate" type="text/template">
    <td><a href = "/esud/complect#number/<%=number%>/tab/2/optional/true"><%=number%></a></td>
    <td><%=name%></td>
    <td><%=unique_props %></td>
    <td><%=Routine.rNToBr(note) %></td>
    <td><%=date_add%></td>
    <td><%=user_add%></td>
</script>
<!--================================================-->

<!--=========PAGER=====================-->
<script type="text/template" id="pagerTemplate">
  <div class="list-pager">
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


<div id="esud_complect" style = "display:none">
    <div  style = "width:99%; margin-top:10px; display:flex">
        <!--LEFT SIDE-->
        <div class = "left-side">
            <div class="navbar" id="navigationButtons">
                <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px; min-height:50px; ">
                    <div class = "line">
                        <div class="input-prepend input-append full-view simple-view" style = "float:left">
                                    <span class="add-on"><b class="fa fa-file-text-o"></b>&nbsp;Комплект:</span>
                                    <input type="text" class="tb-complect-number"  placeholder="артикул" />
                                    <button class="btn btn-success btn-open-complect" id = "btn_open_complect"  >Открыть</button>
                        </div>

                        <ul class="nav nav-tabs full-view" style = "font-size:12px; margin-top:20px;">
                                  <li><a href="#tab-view-complect" data-toggle="tab" data-number="2">Просмотр</a></li>
                                  <li class="active"><a href="#tab-make-complect" data-toggle="tab" data-number="1">Редактирование</a></li>
                        </ul>

                        <div class = "input-prepend full-view" style = "margin-top:20px;">
                                <div class="input-prepend input-append" style = "margin:2px 20px 0px 0px; display:none;">
                                    <label class="checkbox"><input type="checkbox" id="cb-only-options"  />только опции</label>
                                </div>
                                <div class="input-prepend input-append" style = "margin:2px 20px 0px 0px;">
                                    <label class="checkbox"><input type="checkbox" id="cb-use-conditions"  />учитывать условия</label>
                                </div>
                                <button value = "collapsed"  class="btn btn-collapse" style = "margin:0px 0px 3px 0px;"><i class="fa fa-folder"></i>&nbsp;&nbsp;Расскрыть группы</button>
                        </div>

                        <div class = "line pnl-note full-view" style = "margin-top:15px; display:none">
                            <span class = "font16 bold">Примечение:</span><br/>
                            <span class = "font12 color-lightgrey">Укажите только самую важную информацию: основные отличительные особенности комплекта и т.п.</span><br/>
                            <textarea class="span5 tb-note" rows="3"></textarea>
                        </div>

                        <div class="input-prepend input-append full-view edit-view"  style = "margin-top:20px;display:none">
                                    <select class="ddl ddl-save-type" style = "display:none; width:200px;">
                                        <option value = "">Выберите способ сохранения</option>
                                        <option value = "edit">Перезаписать текущий комплект</option>
                                        <option value = "new">Сохранить с новым артикулом</option>
                                    </select>
                                    <button  class="btn btn-save-complect" disabled style = "margin:0px 0px 3px 0px;">
                                        <i class="fa fa-save"></i>&nbsp;&nbsp;Сохранить
                                    </button>
                        </div>
                        <div class="input-prepend input-append full-view"  style = "margin-top:20px;">
                            <button  class="btn btn-calculate-complect" style = "margin:0px 0px 3px 0px; display:none;">
                                <i class="fa fa-calculator"></i>&nbsp;&nbsp;Рассчитать
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
        <!--========-->
        <!--RIGHT SIDE-->
        <div class = "right-side">
               <!--Product Info-->
                <div  id = "config_info">Комплект</div>
                <!--=======Форма работы с комплектом========================-->
                <div id = "esud_complect_body" class="data-body" style = "display:none">
                        <div class="tabbable">
                            <div class="tab-content">
                                    <div class="tab-pane active" id="tab-make-complect">
                                            <div class = "line data-container "  id = "esud_complect_builder">
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
                                    <div class="tab-pane" id="tab-view-complect">
                                            <div class = "line data-container"  id = "esud_complect_view">
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
                            </div>
                        </div>
                </div>
                <!--============================================================-->
                <!--=======Форма работы со списокм комплектов===============-->
                <div id = "esud_complect_list_body" class="data-list-body" style = "display:none">
                    <div class = "line data-container" >
                         <table class = 'in-info'>
                            <thead>
                                <tr>
                                    <td style = "width:10%">Артикул</td>
                                    <td style = "width:25%">Название</td>
                                    <td style = "width:20%">Инд. х-ки</td>
                                    <td style = "width:25%">Примечание</td>
                                    <td style = "width:10%">Дата создания</td>
                                    <td style = "width:10%">Создал</td>
                                </tr>
                            </thead>
                            <tbody class = "complect-data-list"></tbody>
                        </table>
                    </div>
                    <div class = "line complect-list-pager" id = "complect-list-pager">
                    </div>
                </div>
                <!--============================================================-->
        </div>
        <!--========-->
    </div>
</div>
