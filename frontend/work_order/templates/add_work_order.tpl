<!-- ШАБЛОН КОНТЕЙНЕРА ДОБАВЛЕНИЯ НОВЫХ НАРЯДОВ-->
<script id="AddWorkOrdersTemplate" type="text/template">
  <div class="addworks-dlg modal">
    <div class="wtitle">
      <span class="ttl"><b>Заказ:</b> <%= order.contract_number + '.' + order.production_number + '.' + order.production_unit_number %> [<%= order.production_name %>]</span><br/>
      <span class="ttl"><b>Наряд:</b> <%= mode=='edit'? workorder.number: 'новый' %></span>
    </div>
    <div class = "add-works-data-container">
      <ul class="nav nav-tabs">
        <li class="active">
          <a href="#common-works" data-toggle="tab" data-type="common_works">Стандартные работы</a>
        </li>
        <li>
          <a href="#specific-works" data-toggle="tab" data-type="specific_works">Специфические работы</a>
        </li>
      </ul>
      <!--COMMON WORKS TABB-->
      <div id="common-works" class = "common-works"></div>
      <!--SPECIFIC WORKS TABB-->
      <div id="specific-works" class = "specific-works" style="display: none;"></div>
    </div>
    <div class="buttons save-buttons">
      <button class="btn btn-primary savebtn">Сохранить</button>
      <button class="btn closebtn">Закрыть</button>
    </div>
  </div>
</script>

<!-- ШАБЛОН ФОРМЫ УПРАВЛЕНИЯ СПЕЦИФИЧЕСКИМИ РАБОТАМИ-->
<script id="WorksTemplate" type="text/template">
  <div class="input-prepend input-append pnl-search-form" style = "width:100%">
    <span class="add-on" title="Наименование работы"><b class="fa fa-search"></b> Наименование работы: </span>
    <div class="input-append" title="Наименование специфической работы">
      <input class ='tb-work-name' type="text"  style="width:500px;" />
    </div>
    <div class='input-append'>
      <button id= "btnAdd" class="btn btn-primary btn-add">Добавить работу в справочник</button>
    </div>
  </div>
  <div class = "pnl-works-container"></div>
  <div class = "pnl-add-new-work"></div>
</script>

<!-- ШАБЛОН ФОРМЫ ВЫБОРА СПЕЦИФИЕСКИХ РАБОТ-->
<script id="SelectWorksTemplate" type="text/template">
  <div>
    <div class="works-tree">
      <% for(var t in sector_types) { if(!sector_type || sector_type["sector_type"]==t){%>
      <span class="type-ttl"><%= t %></span>
      <% for(var gr in sector_types[t]) { if(!sector || sector["sector_name"]==sector_types[t][gr]['name']){%>
        <div id = "<%= sector_types[t][gr]['code'] %>" class="work-gr <%=sector && sector.sector_name==sector_types[t][gr]['name']?'selected':''%> " data-id="<%= sector_types[t][gr]['_id'] %>" data-name="<%= sector_types[t][gr]['name'] %>" data-code="<%= sector_types[t][gr]['code'] %>" data-type="<%= t %>">
        <a href="javascript:;" class="work-gr" >[<%= sector_types[t][gr]['code'] %>] <%= sector_types[t][gr]['name'] %></a>
        <div class="work-list">
          <table>
          <tr>
            <th style = "width:10px;">
              <input type="checkbox" class="item-chk-all" style = "width:auto" />
            </th>
            <th style = "width:20px;">Код</th>
            <th>Название</th>
            <th style = "width:50px;">Ед.</th>
          </tr>
          <% var wl = sector_types[t][gr]['works'];
            var j =0;
            for(var i in wl){
              if( (!wl[i]['is_specific'] && type=='common' || wl[i]['is_specific'] && type=='specific') && wl[i]['is_active'] && (!exclude_works_id || !(wl[i]['_id'].toString() in exclude_works_id) )  ){%>
              <tr class="<%= (j%2)?'odd':'' %> line-item" data-id="<%= wl[i]['_id'] %>" data-code="<%= wl[i]['code'] %>" data-unit="<%= wl[i]['unit'] %>" data-disabled="<%=sector_types[t][gr]['is_auto'] && wl[i]['is_auto']!=false%>">
              <td>
                <input type="checkbox" class="item-chk" id="<%=wl[i]['_id'].toString()%>" data-id="<%=wl[i]['_id'].toString()%>" style = "width:auto"  <%=(sector_types[t][gr]['is_auto'] && wl[i]['is_auto']!=false )?'disabled':'' %>  />
              </td>
              <td><%= wl[i]['code'] %></td>
              <td><%= wl[i]['name'] %></td>
              <td class="unit" >
                <%= wl[i]['unit'] %>
              </td>
              </tr>
          <%j++;}}%>
          </table>
        </div>
        </div>
      <% }} %>
      <% }} %>
    </div>
  </div>
</script>

<!-- ШАБЛОН ФОРМЫ ДОБАВЛЕНИЯ НОВОЙ СПЕЦИФИЧЕСКОЙ РАБОТЫ-->
<script id="AddWorksTemplate" type="text/template">
  <div class="row">
    <div class="span12">
      <span><b>Заполните параметры для новой работы.</b></span>
    </div>
  </div>
  <div class="row" style = "margin-top:10px;">
    <div class="span10">
      <label>Название:<br/>
        <input  class="span6 tb-work-name" value="<%=name%>" type="text" readonly />
      </label>
    </div>
  </div>
  <div class="row">
    <div class="span10">
      <label>Участок:<br>
        <select class="ddl-sectors" style="width:400px;">
          <option value=""></option>

          %for sector_type in sectors:
          <optgroup label="{{sector_type['info']['name']}}">
            %for sector in sector_type['items']:
            <option
              value="{{str(sector['code'])}}"
              data-id="{{str(sector['_id'])}}"
              data-name="{{str(sector['name'])}}"
              data-type="{{str(sector['type'])}}"
              data-code="{{str(sector['code'])}}"
            >[{{sector['code']}}] {{sector['name']}}</option>
            %end
          </optgroup>
          %end
        </select>
      </label>
    </div>
  </div>
  <div class="row row-transfer-reason-detail">
    <div class="span10">
      <label>Единицы измерения:<br/>
        <!--<input id = 'tbUnit' class="span2 tb-unit" type = "text" placeholder=""></input>-->
        <input
          style = "width: 150px;"
          autocomplete="off"
          data-source=""
          class="tb-unit"
          value="%"
          type="text" />
      </label>
    </div>
  </div>
  <div class="row">
    <div class="span11">
      <label>Коментарий:<br>
        <textarea id="tbComment" class="span11 tb-comment"></textarea>
      </label>
    </div>
  </div>
  <div class="row" style="border-top: dotted 1px #ccc;">
    <div class="span12 text-right" style = "padding-top: 10px;">
      <button class="btn cancel-data" style="margin-right: 10px">Отмена</button>
      <button class="btn save-data btn-primary" style="margin-right: 20px;" >Сохранить</button>
    </div>
  </div>

</script>
