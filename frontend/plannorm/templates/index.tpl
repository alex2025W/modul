%def scripts():
  <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
  <script src="/static/scripts/libs/backbone.defered-view-loader.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.ui.widget.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.iframe-transport.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.fileupload.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/backbone.upload-manager.js?v={{version}}"></script>
  <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
  <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
  <link rel="stylesheet" href="/static/css/backbone.upload-manager.css?v={{version}}"  />
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>

  <!---->
  <link href="/frontend/plannorm/styles/plannorm.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/frontend/plannorm/styles/required_groups.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/plannorm/scripts/app.js?v={{version}}"></script>
  <script src="/frontend/plannorm/scripts/required_groups.js?v={{version}}"></script>
  <script>
    $(function() {
      Backbone.TemplateManager.baseUrl = '{name}';;
      bootbox.setDefaults({locale: "ru",});
      App.initialize();
    });
  </script>

%end
%rebase master_page/base_lastic page_title='Спецификации заказов', current_user=current_user, version=version, scripts=scripts,menu=menu
%include frontend/plannorm/templates/required_groups

<script type="text/javascript">
  var global_sectors = {{! sectors }};
  var global_materials = {{! material_groups }};
  var global_ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
</script>

<!--ШАБЛОН ОТОРАЖЕНИЯ ДОГОВОРА-->
<script id="contractTemplate" type="text/template">
  <h2 id="plan-norm-title">Договор № <%= number %></h2>
  <ul class="nav nav-tabs norm-hist-tab">
    <li class="active">
      <a href="#plan-norm-required-groups" data-toggle="tab" data-type="required_groups">Требуется</a>
    </li>
    <li>
      <a href="#plan-norm-body" data-toggle="tab" data-type="body">Расчеты</a>
    </li>
    <li>
      <a href="#plan-norm-history" data-toggle="tab" data-type="history">История изменений</a>
    </li>
    <li>
      <a href="#plan-norm-import-data" data-toggle="tab" data-type="import_data">Имортировать из XLS</a>
    </li>
    <li>
      <a href="#plan-norm-import-data-history" data-toggle="tab" data-type="import_data_history">История импорта из XLS</a>
    </li>
  </ul>
  <div class="tab-content" id="plan-norm-required-groups"></div>
  <div class="tab-content" id="plan-norm-body" style="display: none"></div>
  <div class="tab-content" id="plan-norm-history" style="display: none;"></div>
  <div class="tab-content" id="plan-norm-import-data" style="display: none;">
    <div class = "import-data-query-box">
      <div class="line" style = "margin:10px 0px">
        <select name="productions" class = "ddl ddl-production" style = "width:400px;"></select>
      </div>
      <div class="linked-files">
        <em style = "margin-left:0px;  ">Файл в котором содержатся данные для импорта. Формат: XLSX таблица.</em>
        <div class="upload-data-manager">
          <div class="source-files"></div>
        </div>
      </div>
      <div class="line">
        <button class="btn btn-import-data" style ="float: right">Импортировать</button>
      </div>
    </div>
    <div class = "import-data-result-box">
    </div>
  </div>
  <div class="tab-content" id="plan-norm-import-data-history" style="display: none;">
  </div>
</script>

<!--ШАБЛОН ОТОРАЖЕНИЯ ПРОДУКЦИИ-->
<script id="productionTemplate" type="text/template">
  <div class="production <%= (number%2)?'odd':'' %>">
    <span class="title"><%= contract_number %>.<%= number %>. <%= name %></span>
    <div class="add-block">
      <a href="javascript:;" class="add-normas">Добавить расчеты</a>
    </div>
    <div class="sector-list">
      <% if(obj.sectorlist){
          obj.sectorlist.sort(function(a,b){
            if(a.routine<b.routine) return -1;
            if(a.routine>b.routine) return 1;
            return 0;
          });
        for(var i=0;i<sectorlist.length;++i) {
          var sec = sectorlist[i];
          if(sec.materials.length>0)
          {
            var visible_materials_count = 0;
            for(var j=0;j<sec.materials.length;++j)
            {
              var mat = sec.materials[j];
              if(App.Views.Main.filterSelectedStatus.length==0 || App.Views.Main.filterSelectedStatus.indexOf(mat['status'].toString())>-1)
                visible_materials_count++;
            }
            if(visible_materials_count>0 || App.Views.Main.filterSelectedStatus.indexOf('4')>-1 ){%>
              <div class="sector">
                <a href="javascript:;" class="sector-ttl" data-routine="<%= sec['routine'] %>" data-id="<%= sec['_id'] %>"><%= sec["sector_name"]+" ["+sec['sector_code']+"]" %></a>
                <div class="matgroup-list" style="display:none;"></div>
              </div>
      <% }}}} %>
    </div>
  </div>
</script>

<!--ШАБЛОН ОТОБРАЖЕНИЯ УЧАСТКА-->
<script id="sectorEditTemplate" type="text/template">
    <div class="group-list">
      <% for(var i in global_materials){
        var is_find = false;
        for(var j in model.materials){
          if(global_materials[i]['_id']==model.materials[j]['materials_group_id'] && (App.Views.Main.filterSelectedStatus.length==0 || App.Views.Main.filterSelectedStatus.indexOf(model.materials[j]['status'].toString())>-1)){
            is_find = true; %>
            <div class="group">
              <a href="javascript:;" class="gr-ttl" data-id="<%= global_materials[i]['_id'] %>"><%= global_materials[i]['name'] + " ["+global_materials[i]['code']+"]" %></a>
              <div class="group-edit" style="display:none">
              </div>
            </div>
          <% break;
          }
        }
        if(!is_find && global_materials[i]['is_active'] && (App.Views.Main.filterSelectedStatus.length==0 || App.Views.Main.filterSelectedStatus.indexOf('4')>-1)){
          for(var j in almatlist){
            if(almatlist[j]==global_materials[i]['_id']){ %>
              <div class="group">
                <a href="javascript:;" class="gr-ttl" data-id="<%= global_materials[i]['_id'] %>"><%= global_materials[i]['name'] + " ["+global_materials[i]['code']+"]" %></a>
                <div class="group-edit" style="display:none">
                </div>
              </div>
            <%}
          }
        }
      }%>
    </div>
    <% if (obj.model['comments']){ %>
      <div class="comments-list">
          <% for(var c in model.comments){
            var dt = new Date(model.comments[c]['date_change']);%>
            <div class="comment-el">
              <span class="comment-from"><%= (dt.getDate().toString().replace( /^([0-9])$/, '0$1' ))+"."+((dt.getMonth()+1).toString().replace( /^([0-9])$/, '0$1' ))+"."+dt.getFullYear() +" "+ dt.getHours().toString().replace( /^([0-9])$/, '0$1' )+":"+dt.getMinutes().toString().replace( /^([0-9])$/, '0$1' )+" ("+ model.comments[c]['user_email'] +")" %></span>
              <spn class="comment-txt"><%= model.comments[c]['text'] %></span>
            </div>
          <%} %>
      </div>
    <% } %>
</script>

<!--ШАБЛОН ОТОБРАЖЕНИЯ ГРУППЫ МАТЕРИАЛОВ-->
<script id="groupEditTemplate" type="text/template">
  <table class="table table-striped1">
    <thead>
      <tr>
        <td colspan="9">
          <div class="row1" style="margin-bottom:10px;">
            <label class="checkbox"><input type="checkbox" class="remark-chk" <%= (obj.remarks && obj.remarks.contains_remark)?"checked":""  %> />Устранение замечаний</label>
          </div>
          <div class="remark-frm" <%= (obj.remarks && obj.remarks.contains_remark)?"":'style="display:none;"'  %>>
            <div class="row1"><label class="control-label" style="padding-top:3px;">№ претензии:&nbsp;</label><input type="text" style="width:600px" class="remark-numbers" /></div>
            <div class="row1"><label class="control-label">Примечание:</label><textarea style="width:100%;" class="remark-comments" /></div>
          </div>
          <div class="row1" style="margin-bottom:10px;">
            <b>Код спецификации: <%= obj.code %></b>
          </div>
        </td>
      </tr>
      <tr>
        <th class="select-item">
          <input type="checkbox" class="cb-select-all-items"  />
        </th>
        <th class="tbuttons"></th>
        <th class="code">Артикул</th>
        <th class="elem" >Материал</th>
        <th class="characters">Инд. характеристики</th>
        <th class="note">Примечание</th>
        <th class="units"></th>
        <th class="value">Объем</th>
        <th class="allowance" title="Допуск">Допуск</th>
        <th class="unit-type">Ед.</th>
        <th class="status">Статус</th>
      </tr>
    </thead>
    <tbody class="elements-list">

    </tbody>
    <tfoot>
      <tr>
        <td colspan="11">
           <% if (obj.comments){ %>
            <div class="comments-list">
                <% for(var c in obj.comments){
                  var dt = new Date(obj.comments[c]['date_change']);%>
                  <div class="comment-el">
                    <span class="comment-from"><%= (dt.getDate().toString().replace( /^([0-9])$/, '0$1' ))+"."+((dt.getMonth()+1).toString().replace( /^([0-9])$/, '0$1' ))+"."+dt.getFullYear() +" "+ dt.getHours().toString().replace( /^([0-9])$/, '0$1' )+":"+dt.getMinutes().toString().replace( /^([0-9])$/, '0$1' )+" ("+ obj.comments[c]['user_email'] +")" %></span>
                    <spn class="comment-txt"><%= obj.comments[c]['text'] %></span>
                  </div>
                <%} %>
            </div>
          <% } %>
           <div class="comments">
            <label>Добавить комментарий</label>
            <textarea rows="2"></textarea>
          </div>
          <% if(!obj.donot_edit) { %>
            <div class="buttons">
              <button class="btn btn-primary savebtn">Сохранить</button>
              <button class="btn closebtn">Закрыть</button>
            </div>
          <% } %>
        </td>
      </tr>
    </tfoot>
  </table>
</script>

<!--ШАБЛОН ОТОБРАЖЕНИЯ МАТЕРИАЛА-->
<script id="groupEditRow" type="text/template">
  <% var user_is_other =  has_access('plannorm','o');
   var can_edit = is_workorder && ((status!=3 && status!=1) || user_is_other); %>

  <tr class="element status_<%=status%>" data-status=<%=status%> <%= is_workorder?'':'class="no-workorder"' %> data-gmid="<%= gmid %>" data-sku="<%= sku %>" data-mid="<%= mid %>" data-clone="<%= is_clone?'true':'false' %>" data-group_code="<%=group_code%>"  data-code="<%=code%>">
    <td class="select-item">
      <input type="checkbox" class="cb-select-item" <%= can_edit ?'':'disabled'%> />
    </td>
    <td class="tbuttons">
      <% if(is_workorder && is_clone){ %>
        <a href="javascript:;" class="icon-minus remove-clone" title="Удалить материал"></a>
      <% } else if(is_workorder){ %>
        <a href="javascript:;" data-disabled = <%=!(can_edit /*&& status!=4 && status!=5*/)%> class="icon-plus add-clone" title="Клонировать материал"></a>
      <% } %>
    </td>
    <td class="code">
      <span class = 'lbl lbl-code-group'><%=group_code%>.</span><span class='lbl lbl-code'><%= code %></span><span class = 'lbl lbl-unique-prop-key'><%=(unique_props_info && unique_props_info['key'])?'.'+unique_props_info['key']:''%></span>
    </td>
    <td class="elem"><%= name %></td>
    <td class="characters  control-group">
      <% if(unique_props_arr.length>0){
        var already_used_props = {};
        if(unique_props_info && unique_props_info['items'] && unique_props_info['items'].length>0){
          for(var i in unique_props_info['items'])
            already_used_props[unique_props_info['items'][i]['_id']]=true;
        }%>
        <select  class="ddl-unique-props" multiple="multiple" data-used_props='<%= JSON.stringify(unique_props_info) %>' <%= can_edit && status!=4 && status!=5?'':'disabled' %> data-source='<%=JSON.stringify(unique_props_arr)%>'>
          <% for(var i in unique_props_arr){ if(unique_props_arr[i]['is_active'] || unique_props_arr[i]['_id'] in already_used_props){%>
            <option data-name = "<%=unique_props_arr[i]['name']%>" data-key="<%=unique_props_arr[i]['key']%>" value="<%=unique_props_arr[i]['key']%>"><%=unique_props_arr[i]['key']%>. <%=unique_props_arr[i]['name']%></option>
          <%}}%>
        </select>
        <input type="hidden"  class="tb-unique-props"  data-value='<%= JSON.stringify(unique_props_info) %>'  />
      <%}else{%>
        <span class="lbl" style ="margin-left: 10px;">Нет характеристик</span>
      <%}%>
    </td>
    <td class="note">
      <input type="text" class = "note" <%= can_edit ?'':'disabled'%> value="<%= obj.note ? Routine.stripTags(note):'' %>" />
    </td>
    <td class="units" data-count="<%= production_count %>"><%= production_count %>&nbsp;x&nbsp;</td>
    <td class="value control-group"><input type="text" class = "volume" <%= can_edit && status!=4&& status!=5 ?'':'disabled'%> value="<%= pto_size %>" /></td>
    <td class="allowance">
      <input type="text" class = "allowance" <%= can_edit ?'':'disabled'%> value="<%= obj.allowance? allowance:'0' %>" />
    </td>
    <td class="unit-type"><%= unit_pto %></td>
    <td class="status">
      <select <%= can_edit?'':'disabled' %>>
        <% if(status==4 || status===undefined) {%>
          <option value="4" <%= (status==4)?'selected':'' %>>Не определено</option>
        <% } %>
        <option value="5" <%= (status==5)?'selected':'' %>>Требуется</option>
        <option value="0" <%= (status==0)?'selected':'' %>>В расчете</option>
        <option value="3" <%= (status==3)?'selected':'' %>>На согласовании</option>
        <% if(user_is_other || status==1){ %>
          <option value="1" <%= (status==1)?'selected':'' %>>Согласовано</option>
        <% } %>
        <% if(user_is_other || status==2){ %>
          <option value="2" <%= (status==2)?'selected':'' %>>Отклонено</option>
        <% } %>
      </select>
    </td>
  </tr>
</script>

<!--ШАБЛОН ДОБАВЛЕНИЯ МАТЕРИАЛА-->
<script id="normsAddForm" type="text/template">
  <div class="norm-add-form modal">
    <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
    <h5>Добавление новых расчетов</h5>
    <h3><%= number %>. <%= name %></h3>
    </div>
    <div class="modal-body"></div>
    <div class="modal-footer">
    <a href="javascript:;" class="btn btn-primary btn-save">Сохранить</a>
    <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</a>
    </div>
  </div>
</script>
<script id="editAddForm_type" type="text/template">
  <div class="edit-type">
    <span class="type-ttl">
      <%= type %>
    </span>
    <div class="sectors-list">
      <% for(var i in sectors){ %>
        <div class="sector-el">
          <a href="javascript:;" class="<%= sectors[i].used?'used':'' %> sector-ttl" data-id="<%= sectors[i]['_id'] %>"><%= sectors[i].name + ' ['+sectors[i].code+']'  %></a>
          <div class="matgroup-list" style="display:none;">
          </div>
        </div>
      <% } %>
    </div>
  </div>
</script>

<!--ШАБЛОН ОТОБРАЖЕНИЯ ИСТОРИИ-->
<script id="changeHistoryFilterTemplate" type="text/template">
  <div class="search-box" style = "margin: 0px 0px 20px 0px">
    <span class = "lbl" style ="margin-right:5px;"><b>Поиск:</b></span>
    <select class="ddl-products" style = "margin-top:10px;">
      <option value="">Вся продукция</option>
      <% productions.map(function(product){ %>
        <option value="<%=product.number%>"><%=product.number%>.<%=product.name%></option>
      <%});%>
    </select>
    <input type="text" class = "tb tb-material-key" style = "margin-top:10px;" placeholder="артикул"  />
    <input type="button" class = "btn btn-filter" value = "Найти" />
  </div>
</script>
<script id="changeHistoryTemplate" type="text/template">
  <% productions.map(function(product){ %>
    <div class="production <%= (product.number%2)?'odd':'' %>" data-product_key="<%=product.number%>">
      <span class="title"><%= product.number %>. <%= product.name %></span>
      <% var change_history = []; %>
      <% (product.sectorlist || []).map(function(sector){
        (sector.change_history || []).map(function(ch){
          if(ch['type']=='update'){
            ch['sec'] = sector;
            change_history.push(ch);
          }
        });
      }); %>
      <% if(change_history.length>0) {
        change_history.sort(function(a,b){
          var da = Routine.parseDateTime(a.date,'yyyy-mm-ddTh:i:s');
          var db = Routine.parseDateTime(b.date,'yyyy-mm-ddTh:i:s');
          if(da<db) return 1;
          if(da>db) return -1;
          return 0;
        }); %>

      <table class="table comments-table">
        <tr>
          <th rowspan="2">Сохранено</th>
          <th rowspan="2">Автор</th>
          <th rowspan="2">Объект</th>
          <th colspan="4">Изменений</th>
        </tr>
        <tr>
          <th style="width:8%;">Всего</th>
          <th style="width:25%;">Инд. характеристики</th>
          <th style="width:8%;">Объем</th>
          <th style="width:10%;">Статус</th>
        </tr>
      <% change_history.map(function(ch){ %>
        <% var t_ih = 0, t_value=0, t_status=0;
          ch['data'].map(function(dt){
            if(dt.type=='add'){
              t_ih++; t_value++; t_status++;
            }
            else{
              if(dt['old']['unique_props']!=dt['new']['unique_props']) t_ih++;
              if(dt['old']['pto_size']!=dt['new']['pto_size']) t_value++;
              if(dt['old']['status']!=dt['new']['status']) t_status++;
            }
        }); %>
        <tr>
          <td><%= (ch['type']=='update')?("<a  data-key='"+ch["date"].toString().replace(' ','_')+"' href=\"javascript:;\" class=\"change-more\">"+ Routine.convertDateToLocalTime(ch["date"]) +"</a>"):((ch['type']=='add')?Routine.convertDateToLocalTime(ch["date"]):"") %></td>
          <td><%= global_ALL_USERS[ch["user"]] %></td>
          <td><%= ch['sec']["sector_name"]+" ["+ch['sec']['sector_code']+"]" %></td>
          <td><%= ch.data.length %></td>
          <td><%= t_ih %></td>
          <td><%= t_value %></td>
          <td><%= t_status %></td>
        </tr>
        <% if(ch['type']=='update') { %>
        <tr class="change-more-data" >
          <td colspan="7" class="change-more-data-td">
            <table class="more-data-tbl">
              <tr>
                <th rowspan="2" style="width:40%;">Материал</th>
                <th rowspan="2">Действие</th>
                <th colspan="4">Изменения</th>
              </tr>
              <tr>
                <th style="width:8%;"></th>
                <th style="width:25%;">Инд. характеристики</th>
                <th style="width:8%;"">Объем</th>
                <th style="width:10%;">Статус</th>
              </tr>
              <% ch['data'].map(function(item){ %>
                <% if(item.type=='add') { %>
                  <tr>
                    <td class="c-ttl">
                      <%= App.getMaterialNameByGlobalId(item['new']['global_id']) %>
                    </td>
                    <td>Добавлено</td>
                    <td>Данные:</td>
                    <td>
                      <%= item['new']['unique_props'] %>
                    </td>
                    <td>
                      <%= item['new']['pto_size'] %>
                    </td>
                    <td>
                      <%= App.getStatusByCode(item['new']['status']) %>
                    </td>
                  </tr>
                <% } else { %>
                  <tr>
                    <td rowspan="2" class="c-ttl">
                      <%= App.getMaterialNameByGlobalId(item['new']['global_id']) %>
                    </td>
                    <td rowspan="2">Изменено</td>
                    <td>Было:</td>
                    <td <%= (item['old']['unique_props']!=item['new']['unique_props'])?'class="modified"':'' %> >
                      <%= item['old']['unique_props'] %>
                    </td>
                    <td <%= (item['old']['pto_size']!=item['new']['pto_size'])?'class="modified"':'' %>>
                      <%= item['old']['pto_size'] %>
                    </td>
                    <td <%= (item['old']['status']!=item['new']['status'])?'class="modified"':'' %>>
                      <%= App.getStatusByCode(item['old']['status']) %>
                    </td>
                  </tr>
                  <tr>
                    <td>Стало:</td>
                    <td <%= (item['old']['unique_props']!=item['new']['unique_props'])?'class="modified"':'' %> >
                      <%= item['new']['unique_props'] %>
                    </td>
                    <td <%= (item['old']['pto_size']!=item['new']['pto_size'])?'class="modified"':'' %>>
                      <%= item['new']['pto_size'] %>
                    </td>
                    <td <%= (item['old']['status']!=item['new']['status'])?'class="modified"':'' %>>
                      <%= App.getStatusByCode(item['new']['status']) %>
                    </td>
                  </tr>
                <% } %>
              <% }); %>
            </table>
          </td>
        </tr>
        <% } %>
      <% }); %>
      </table>

      <% } else { %>
        <div class="empty">
          Нет зафиксированных изменений по продукции
        </div>
      <% } %>
    </div>
  <% }); %>
</script>

<!--ОСНОВНАЯ ФОРМА-->
<div id="planNorm" >
  <div class = "row hidden-print" style = "margin-left: 0px;">
    <div  class="span12" style = "width:100%;">
      <div class="navbar">
        <div  id = "pnlPlanNormFilter" class="navbar-inner" style=  "padding-top:10px" >
          <div>

            <!--<div class="input-prepend input-append">
              <span class="add-on"><b class="icon-list-alt"></b></span>
              <input type="text" class="filter-number" id = "tbContractNumber"  placeholder="введите номер договора" />
              <button id= "btnPlanNormFind" class="btn btn-primary btn-filter">Открыть</button>
            </div>-->
            <div class="input-prepend input-append">
              <span class="add-on"><b class="icon-list-alt"></b></span>
              <select  id="filter-type" style = "width:150px;">
                <option value="contract" >Договор</option>
                <option value="order" selected>Заказ</option>
                <option value="specification">Спецификация</option>
              </select>
              <input type="text" class="filter-number" id="search-number" placeholder="введите номер" style = "width:100px;" />
              <button id= "btnPlanNormFind" class="btn btn-primary btn-filter">Открыть</button>
            </div>


            <button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; display:none;"  ><i class="icon-download-alt"></i></button>
          </div>
          <!--FILTERS-->
          <div style = "margin-top:10px; margin-bottom:10px;">
            <!--Works filter-->
            <div class='pnl-ddl input-append pnl-ddl-status' style='display:none; margin:3px 0px 3px 0px;'>
              <select class="ddl-status" multiple="multiple"  style = "display:none">
                <option value="4">Не определено</option>
                <option value="5">Требуется</option>
                <option value="0">В расчете</option>
                <option value="3">На согласовании</option>
                <option value="1">Согласовано</option>
                <option value="2">Отклонено</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="pnlPlanNormBody" style = "margin-left:20px;">
    <span class="notification">
      Введите номер договора для выполнения плановых рассчетов.
    </span>
  </div>
</div>


<!--- ШАБЛОН УКАЗАНИЯ КОРРЕКТИРОВКИ -->
<script id="correctionsForm" type="text/template">
  <div class="correction-add-form modal">
    <div class="modal-header">
    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
    <h5>Укажите причину корректировки</h5>
    </div>
    <div class="modal-body">
      <textarea></textarea>
    </div>
    <div class="modal-footer">
    <a href="javascript:;" class="btn btn-primary btn-save">Сохранить</a>
    <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</a>
    </div>
  </div>
</script>


<!--=================================================================================-->
<!-- Шаблон отображения списка ошибок результата импорта данных -->
<script id="ImportDataErrorsListTemplate" type="text/template">
  <span style = "font-size: 20px; margin-top:10px; display: block;">Результат импорта</span>
  <table class="in-info data-errors" style = "margin-top:10px; margin-bottom: 30px;">
    <thead>
      <tr>
        <td style = "width:1%">№</td>
        <td style = "width:5%">Участок</td>
        <td style = "width:5%">Группа</td>
        <td style = "width:5%">Артикул</td>
        <td style = "width:30%">Материал</td>
        <td style = "width:25%">Характеристика</td>
        <td style = "width:5%">Объём</td>
        <td style = "width:25%">Статус</td>
      </tr>
    </thead>
  </table>
</script>

<!-- Шаблон отображения конкретного коментария -->
<script id="ImportDataErrorsItemTemplate" type="text/template">
  <td ><%=i%></td>
  <td ><span title = "<%=sector_name%>"><%=sector_code%></span></td>
  <td ><span title = "<%=material_group_name%>"><%=material_group_code%></span></td>
  <td ><%=full_code%></td>
  <td ><%=material_name%></td>
  <td ><%=unique_prop%></td>
  <td ><%=volume%></td>
  <td style="width:100%">
    <% var error_msg_arr = [];
    if(errors.length>0)
    {
       for(var i in errors)
       {
        var error = errors[i];
        switch(error['type'])
        {
          case 'dublicate':
            error_msg_arr.push('Дублирование позиций');
          break;
          case 'material_not_found':
            error_msg_arr.push('Материал не найден в справочнике');
          break;
          case 'material_short_article':
            error_msg_arr.push('У данной позиции артикул не может быть двузначным. В справочнике у материала есть характеристики');
          break;
          case 'sector_not_found':
            error_msg_arr.push('Участок не найден в справочнике');
          break;
          case 'volume_not_diggit':
            error_msg_arr.push('Задан неверный формат объема материала');
          break;
          case 'already_in_plan_norms':
            error_msg_arr.push('Заведен ранее');
          break;
          case 'incorrect_name_or_code_unique_prop':
            error_msg_arr.push('Некорректный артикул или название характеристики материала');
          break;
          case 'incorrect_name_or_code_material':
            error_msg_arr.push('Название материала не совпадает с его артикулом');
          break;
          case 'incorrect_full_code':
            error_msg_arr.push('Некорректный артикул');
          break;
          case 'unique_prop_not_found':
            error_msg_arr.push('Указанная характеристика не найдена');
          break;
          default:
            error_msg_arr.push('Неизвестная ошибка');
          break;
        }
      }
    }%>
    <span title = "<%=errors.length>0?error_msg_arr.join('\n') :''%>"><%=errors.length>0?error_msg_arr.join('\n'):'Ок'%></span>
  </td>
</script>

<!-- Шаблон отображения истории импорта данных -->
<script id="ImportDataHistoryListTemplate" type="text/template">
  <div class = "line">
    <span style = "font-size: 20px; margin-top:10px; display: block;">История импорта</span>
    <table class="in-info data-history" style = "margin-top:10px; margin-bottom: 30px; width: 800px;">
      <thead>
        <tr>
          <td style = "width:15%;">Дата</td>
          <td style = "width:25%" >Пользователь</td>
          <td style = "width:50%;">Продукция</td>
          <td style = "width:10%">Объём</td>
        </tr>
      </thead>
      <tbody class = "data-body"></tbody>
    </table>
  </div>
  <div class = "line detail-list-box" style = "margin-top: 20px;"></div>
</script>

<!-- Шаблон отображения конкретного элемента истории -->
<script id="ImportDataHistoryItemTemplate" type="text/template">
  <td><%=moment.utc(date, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%></td>
  <td><%=global_ALL_USERS[user_email]%></td>
  <td><%=product_number%>.<%=product_name%></td>
  <td>
    <% if(errors.length>0){%>
    <span class="lnk lnk-detail">показать</span>
    <%}%>
  </td>
</script>
<!--=================================================================================-->
