%def scripts():
  <link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
  <link href="/static/css/treeview.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/print.css?v={{version}}" rel="stylesheet" media="print">
  <link rel="stylesheet" type="text/css?v={{version}}" href="https://cdn.datatables.net/fixedheader/3.1.3/css/fixedHeader.dataTables.min.css">
  <!---->
  <script src="/static/scripts/libs/multi-sort.collection.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="static/scripts/routine.js?v={{version}}1"></script>
  <script src="/static/scripts/libs/jquery.dataTables-1.10.0.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.scrollTo.min.js?v={{version}}"></script>
  <!--<script src="/static/scripts/libs/bootstrap-multiselect.js?v=3"></script>-->
  <script src="/frontend/libs/bootstrap.multiselect.v2/index.js?v={{version}}"></script>
  <link href="/frontend/libs/bootstrap.multiselect.v2/index.css?v={{version}}" rel="stylesheet">
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/jquery-ui.min.js"></script>
  <script src="/frontend/libs/jquery.datatables/jquery.datatables.min.js?v={{version}}"></script>
  <!--<link rel="stylesheet" type="text/css?v={{version}}" href="/frontend/libs/jquery.datatables/jquery.datatables.min.css?v={{version}}">-->
  <!---->
  <link href="/frontend/mto/styles/mto.css?v={{version}}" rel="stylesheet" media="screen, print">
  <script src="frontend/mto/scripts/app.js?v={{version}}"></script>
  <script src="frontend/mto/scripts/models.js?v={{version}}"></script>
  <script src="frontend/mto/scripts/collections.js?v={{version}}"></script>
  <script src="frontend/mto/scripts/router.js?v={{version}}"></script>
  <script src="frontend/mto/scripts/search_form_view.js?v={{version}}"></script>
  <script src="frontend/mto/scripts/data_list_view.js?v={{version}}"></script>
  <script type="text/javascript" language="javascript" src="https://cdn.datatables.net/fixedheader/3.1.3/js/dataTables.fixedHeader.min.js"></script>
  <script>
    $(function(){
      bootbox.setDefaults({locale: "ru"});
      App.initialize(
        {{! order_numbers }},
        {{! sectors }},
        {{! user_filters_info }},
      );
    });
    window.MANAGERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in users])}} };
  </script>
%end

%rebase master_page/base_lastic page_title='Производство. MTO', current_user=current_user, version=version, scripts=scripts, menu=menu

<!--Шаблон элемента выпадающего спика участков панели фильтров-->
<script id="filterItemTemplateSector" type="text/template">
  <option value = "<%=code%>" <%=(checked)?"selected":""%>><%="[" + code + "] " + name%></option>
</script>

<!--Шаблон элемента выпадающего спика заказов панели фильтров-->
<script id="filterItemTemplateOrder" type="text/template">
  <option value = "<%=number%>" <%=(checked)?"selected":""%>><%=number%></option>
</script>

<!-- Шаблон оповещения о необходимости заполнения критериев поиска данных -->
<script id="SetSearchQueryTemplate" type="text/template">
  <div class="span12"><span>Задайте критерии поиска.</span></div>
</script>

<!-- Шаблон оповещения о том, что ничего не найдено -->
<script id="DataNotFoundTemplate" type="text/template">
  <div class="span12"><span>По вашему запросу ничего не найдено.</span></div>
</script>

<!-- Шаблон контейнер для списка занных -->
<script id="DataListTemplate" type="text/template">
  <!--Блок для основных данных-->
  <div class="css-treeview">
    <ul class="data-list"> </ul>
  </div>
</script>

<!-- Шаблон отображения заказа -->
<script id="OrderItemTemplate" type="text/template"><li class = "h<%=level%>"><label class="lbl-plus" for="item-<%=index%>">&nbsp;</label><input type="checkbox" id="item-<%=index%>" class = "cb-item"><label class="item-order underline-ccc lbl-item h<%=level%>">[<%=number%>] <%=name%></label><ul class = "data-list data-orders"></ul></li></script>

<!-- Шаблон отображения участка -->
<script id="SectorItemTemplate" type="text/template"><li class = "h<%=level%>"><label class="lbl-plus" for="item-<%=index%>">&nbsp;</label><input type="checkbox" id="item-<%=index%>" class = "cb-item"><label class="item-sector underline-ccc lbl-item h<%=level%>">[<%=number%>] <%=name%></label><ul class = "data-list data-sectors"></ul></li></script>

<!-- Шаблон отображения группы материалов -->
<script id="MaterialGroupItemTemplate" type="text/template"><li class = "h<%=level%>"><label class="lbl-plus" for="item-<%=index%>">&nbsp;</label><input type="checkbox" id="item-<%=index%>" class = "cb-item"><label class="item-materialgroup underline-ccc lbl-item h<%=level%>" >[<%=number%>] <%=name%></label><ul class = "data-list data-materialsgroups"></ul></li></script>

<!-- Шаблон отображения списка материалов -->
<script id="MaterialsListTemplate" type="text/template">
  <span style = "font-size: 20px; margin-top:10px; margin-bottom: 10px; display: block">Основные данные</span>
  <table class="in-info main-data" >
    <thead>
      <tr>
        <th class="column-data order_number" style = "width:50px;"><span>Заказ</span></th>
        <th class="column-data material_group_key" style = "width:150px;">
          <span>Группа материалов</span>
        </th>
        <th class="column-data material_key" style = "width:50px;"><span>Код</span></th>
        <th class="column-data material_name"><span>Название</span></th>
        <th class="column-data unique_props_name" style = "width:200px;"><span>Х-ки</span></th>
        <th class="column-data note" style = "width:200px;"><span>Примечание</span></th>
        <th class="column-data unit_pto" style = "width:50px;"><span>Ед.</span></th>
        <th class="column-data pto_size" style = "width:50px;"><span>Объем</span></th>
        <th class="column-data sum price" style = "width:50px;"><span>Цена без НДС</span></th>
        <th class="column-data sum pto_size_confirmed" style = "width:50px;"><span>Согласовано</span></th>
        <th class="column-data sum inpay" style = "width:50px;"><span>В оплате</span></th>
        <th class="column-data sum payed" style = "width:50px;"><span>Оплачено</span></th>
        <th class="column-data sum onstore" style = "width:50px;"><span>На складе</span></th>
        <th class="column-data sum last-column onwork" style = "width:50px;"><span>Отгружено</span></th>
        <th class="column-data sum last-column not_onwork" style = "width:50px;"><span>Не отгружено</span></th>
        <th class="column-data sum last-column not_payed" style = "width:50px;"><span>Требуется оплата</span></th>
      </tr>
    </thead>
    <tbody class = "materials-body"></tbody>
  </table>
</script>

<!-- Шаблон отображения подвала для списка материалов -->
<script id="MaterialsListFooterTemplate" type="text/template">
  <tfoot>
    <% var need_pay = pto_size - (((onwork+onstore)>payed)?onwork+onstore:payed);
      need_pay = (need_pay < 0)?0:need_pay;%>
    <th class = "order_number"></th>
    <th class = "material_group_key"></th>
    <th class = "material_key"></th><!--код материала-->
    <th class = "material_name"></th><!--Название материала-->
    <th class = "unique_props_name"></th><!--характеристики-->
    <th class = "note"></th><!--примечение-->
    <th class = "unit_pto"></th><!--ЕД.-->
    <th class = "pto_size"><%=Routine.addCommas(pto_size.toFixed(3).toString()," ")%></th><!--объем-->
    <th class = "price"></th><!--Цена без НДС-->
    <th class = "pto_size_confirmed"><%=Routine.addCommas(pto_size.toFixed(3).toString()," ")%></th><!--Согласовано-->
    <th class = "inpay"><%=Routine.addCommas(inpay.toFixed(3).toString()," ")%></th><!--В оплате-->
    <th class = "payed"><%=Routine.addCommas(payed.toFixed(3).toString()," ")%></th><!--Оплачено-->
    <th class = "onstore"><%=Routine.addCommas(onstore.toFixed(3).toString()," ")%></th><!--На складе-->
    <th class = "onwork"><%=Routine.addCommas(onwork.toFixed(3).toString()," ")%></th><!--отгружено-->
    <th class = "not_onwork"><%=Routine.addCommas((pto_size-onwork).toFixed(3).toString()," ")%></th><!--отгружено-->
    <th class = "not_payed"><%=Routine.addCommas(need_pay.toFixed(3).toString()," ")%></th><!--требуется оплата-->
  </tfoot>
</script>

<!-- Шаблон отображения конкретного материала -->
<script id="MaterialItemTemplate" type="text/template">
  <%var inpay = ('inpay' in facts && facts['inpay'])?facts['inpay']:0;
    var payed = ('payed' in facts && facts['payed'])?facts['payed']:0;
    var onstore = ('onstore' in facts && facts['onstore'])?facts['onstore']:0;
    var onwork = ('onwork' in facts && facts['onwork'])?facts['onwork']:0;
    var need_pay = pto_size - (((onwork+onstore)>payed)?onwork+onstore:payed);
    need_pay = (need_pay < 0)?0:need_pay;%>
  <td class = "order_number"><%=order_number%></td>
  <td class = "material_group_key">[<%=material_group_key%>] <%=material_group_name%></td>
  <td class = "material_key">
    <%=material_group_key%>.<%=material_key%><%=unique_props_key?'.'+unique_props_key:''%>
  </td>
  <td class = "material_name"><%=material_name%></td>
  <td class = "unique_props_name"><%=unique_props_name%></td>
  <td class = "note"><%=note%></td>
  <td class = "unit_pto"><%=unit_pto%></td>
  <td class="digit pto_size"><%=Routine.addCommas(pto_size.toFixed(3).toString()," ")%></td>
  <% if('price' in facts && facts['price']) { %>
    <td class="digit price"><%=Routine.toMoneyStr(Routine.addCommas(facts['price'].toFixed(2).toString()," "))%></td>
  <%} else { %>
    <td
      class="digit price"
      title="Цена предыдущей закупки">
      <i><%=(koef && price_per_unit)?Routine.toMoneyStr(Routine.addCommas((price_per_unit / parseFloat(koef)).toFixed(2).toString()," ")):'-'%></i>
    </td>
  <%}%>

  <td class="digit pto_size_confirmed"><%=Routine.addCommas(pto_size.toFixed(3).toString()," ")%></td>
  <td class="digit inpay"><%=('inpay' in facts && facts['inpay'])?Routine.addCommas(facts['inpay'].toFixed(3).toString()," "):'-'%> </td>
  <td class="digit payed"><%=('payed' in facts && facts['payed'])?Routine.addCommas(facts['payed'].toFixed(3).toString()," "):'-'%> </td>
  <td class="digit onstore"><%=('onstore' in facts && facts['onstore'])?Routine.addCommas(facts['onstore'].toFixed(3).toString()," "):'-'%> </td>
  <td class="digit onwork"><%=('onwork' in facts && facts['onwork'])?Routine.addCommas(facts['onwork'].toFixed(3).toString()," "):'-'%> </td>
  <td class="digit not_onwork"><%=Routine.addCommas((pto_size-(('onwork' in facts)?facts['onwork']:0)).toFixed(3).toString()," ")%></td><!--отгружено-->
  <td class="digit not_payed"><%=Routine.addCommas(need_pay.toFixed(3).toString()," ")%></td><!-- требуется оплата-->
</script>

<script id="MaterialItemTemplatePrice" type="text/template">
  <%var inpay = ('inpay' in facts)?facts['inpay'] : 0;
    var payed=('payed' in facts)?facts['payed'] : 0;
    var onstore=('onstore' in facts)?facts['onstore'] : 0;
    var onwork=('onwork' in facts)?facts['onwork'] : 0;
    var notonwork = pto_size - onwork;
    var new_pto_size = pto_size;
    var calculated_price = 0;

    if('price' in facts && facts['price'])
      calculated_price = facts['price'];
    else if(koef && price_per_unit)
      calculated_price = price_per_unit / parseFloat(koef);

    if(calculated_price){
      new_pto_size = pto_size * calculated_price;
      inpay = inpay * calculated_price;
      payed = payed * calculated_price;
      onstore = onstore * calculated_price;
      onwork = onwork * calculated_price;
      notonwork = notonwork * calculated_price;
    }

    var need_pay = new_pto_size - (((onwork+onstore)>payed)?onwork+onstore:payed);
    need_pay = (need_pay < 0)?0:need_pay;%>

  <td class = "order_number"><%=order_number%></td>
  <td class = "material_group_key">[<%=material_group_key%>] <%=material_group_name%></td>
  <td class = "material_key">
    <%=material_group_key%>.<%=material_key%><%=unique_props_key?'.'+unique_props_key:''%>
  </td>
  <td class = "material_name"><%=material_name%></td>
  <td class = "unique_props_name"><%=unique_props_name%></td>
  <td class = "note"><%=note%></td>
  <td class = "unit_pto"><%=unit_pto%></td>
  <td class="digit pto_size"><%=Routine.addCommas(pto_size.toFixed(3).toString()," ")%></td>

  <% if('price' in facts && facts['price']) { %>
    <td class="digit price"><%=Routine.toMoneyStr(Routine.addCommas(facts['price'].toFixed(2).toString()," "))%></td>
  <%} else { %>
    <td
      class="digit price"
      title="Цена предыдущей закупки">
      <i><%=(koef && price_per_unit)?Routine.toMoneyStr(Routine.addCommas((price_per_unit / parseFloat(koef)).toFixed(2).toString()," ")):'-'%></i>
    </td>
  <%}%>

  <td class="digit pto_size_confirmed"><%=(calculated_price && new_pto_size)?Routine.toMoneyStr(Routine.addCommas(new_pto_size.toFixed(2).toString()," ")) : '-'%></td>
  <td class="digit inpay"><%=(calculated_price && inpay)?Routine.toMoneyStr(Routine.addCommas(inpay.toFixed(2).toString()," ")) : '-'%></td>
  <td class="digit payed"><%=(calculated_price && payed)?Routine.toMoneyStr(Routine.addCommas(payed.toFixed(2).toString()," ")) : '-'%></td>
  <td class="digit onstore"><%=(calculated_price && onstore)?Routine.toMoneyStr(Routine.addCommas(onstore.toFixed(2).toString()," ")) : '-'%></td>
  <td class="digit onwork"><%=(calculated_price && onwork)?Routine.toMoneyStr(Routine.addCommas(onwork.toFixed(2).toString()," ")) : '-'%></td>
  <td class="digit not_onwork"><%=(calculated_price && notonwork)?Routine.toMoneyStr(Routine.addCommas(notonwork.toFixed(2).toString()," ")) : '-'%></td><!--отгружено-->
  <td class="digit not_payed"><%=(calculated_price)?Routine.toMoneyStr(Routine.addCommas(need_pay.toFixed(2).toString()," ")) : '-'%></td><!--требуется оплата-->
</script>

<!-- Шаблон отображения списка коментариев -->
<script id="CommentsListTemplate" type="text/template">
  <span class = "lbl-comments" style = "font-size: 20px; margin-top:10px; display: block;">Коментарии</span>
  <table class="in-info data-comments" style = "margin-top:10px; margin-bottom: 30px;">
    <thead>
      <tr>
        <td style = "width:50px;" class = "order_number">Заказ</td>
        <td style = "width:200px;" class = "sector_code">Участок</td>
        <td style = "width:150px;" class = "material_group_key">Группа материалов</td>
        <td style = "width:200px">Пользователь</td>
        <td>Коментарий</td>
        <td style = "width:150px">Дата</td>
      </tr>
    </thead>
    <tbody class = 'comments-body'></tbody>
  </table>
</script>

<!-- Шаблон отображения конкретного коментария -->
<script id="CommentItemTemplate" type="text/template">
  <td class = "order_number"><%=order_number%></td>
  <td class = "sector_code">[<%=sector_code%>] <%=sector_name%></td>
  <td class = "material_group_key">[<%=group_key%>] <%=group_name%></td>
  <td><%=window.MANAGERS[user_email]%></td>
  <td><%=text%></td>
  <td><%=moment.utc(date, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm')%></td>
</script>

<!-- Шаблон отображения истории импорта данных -->
<script id="ImportDataHistoryListTemplate" type="text/template">
  <div class = "line">
    <span style = "font-size: 20px; margin-top:10px; display: block;">История импорта</span>
    <table class="in-info data-history" style = "margin-top:10px; margin-bottom: 30px; width: 800px;">
      <thead>
        <tr>
          <td>Дата</td>
          <td>Заказ</td>
        </tr>
      </thead>
      <tbody class = "data-body"></tbody>
    </table>
  </div>
</script>

<!-- Шаблон отображения конкретного элемента истории -->
<script id="ImportDataHistoryItemTemplate" type="text/template">
  <td><%=date?moment.utc(date, 'YYYY-MM-DD HH:mm').local().format('DD.MM.YYYY HH:mm'):'-'%></td>
  <td><%=number%></td>
</script>

<!-- Основная форма -->
<div class = "row hidden-print filter-panel"  id="find-order-form" >
  <div  class="span12" style = "width:100%; ">
    <div class="row" style = "margin-left:0px;">
      <div  class="span12" style = "width:100%;">
        <!--FILTERS-->
        <div class="navbar">
          <div  id = "pnlJobLogFilter" class="navbar-inner" style=  "padding-top:10px" >
            <div class = "pnl-filters" style = "margin-bottom:40px; ">
                <!--Contract filter-->
                <div class='pnl-ddl input-append pnl-ddl-contracts'>
                  <select class="ddl-contracts" multiple="multiple" style = "display:none">
                    %for contract_number in contract_numbers:
                      <option value="{{contract_number}}">{{contract_number}}</option>
                    %end
                  </select>
                </div>
                <!--Order filter-->
                <div class='pnl-ddl input-append pnl-ddl-orders'>
                  <select class="ddl-orders" multiple="multiple" style = "display:none"></select>
                </div>
                <!--SectorType filter-->
                <div class='pnl-ddl input-append pnl-ddl-sector-types'>
                  <select class="ddl-sector-types" multiple="multiple" style = "display:none">
                    %for row in sector_types:
                      <option value="{{ row['type'] }}">{{ row['type'] }}</option>
                    %end
                  </select>
                </div>
                <!--Sector filter-->
                <div class='pnl-ddl input-append pnl-ddl-sectors'>
                  <select class="ddl-sectors" multiple="multiple" style = "display:none"></select>
                </div>
                <!--MaterialsGroups filter-->
                <div class='pnl-ddl input-append pnl-ddl-materialsgroups' >
                  <select class="ddl-materialsgroups" multiple="multiple"  style = "display:none">
                  %for material_group in materials_groups:
                    <option value="{{str(material_group['code'])}}">[{{material_group['code']}}] {{material_group['name']}}</option>
                  %end
                  </select>
                </div>
                <!--Status filter-->
                <div class='input-append pnl-ddl-status'>
                  <select class="ddl-status" style = "display:none">
                    <option value="">Все</option>
                    <option value="pto">Согласовано</option>
                    <option value="inpay">В оплате</option>
                    <option value="payed">Оплачено</option>
                    <option value="onstore">На складе</option>
                    <option value="onwork">Отгружено</option>
                    <option value="notonwork">Не отгружено</option>
                    <option value="notpayed">Требуется оплата</option>
                  </select>
                </div>

                <!--save settings-->
                <div class="input-append">
                  <div class="add-on">
                    <label class="checkbox" style="font-size: 11px;" title="Запомнить настройки фильтров при следующем входе.">
                      <input type="checkbox" id="cbSaveFilters" />Сохранить настройки фильтров
                    </label>
                  </div>
                </div>
                <!--Buttons-->
                <div class="input-append">
                  <button id= "btnDataFind" class="btn btn-primary btn-search">Показать</button>
                  <button type="button" style="color: #FFF" class="btn btn-primary btn-download-stat"  title="Выгрузить статистику" >
                    <i class="fa fa-download"></i>
                  </button>
                </div>
            </div>
          </div>
        </div>
        <!--end filter-->
      </div>
    </div>
    <div class="row" style = "margin-left:0px;">
      <div class="span12" style = "width:100%;">
        <ul class="nav nav-tabs mto-tabs">
          <li class="active"><a href="#data-body" data-toggle="tab" data-type="body">Данные</a></li>
          <li><a href="#mto-import-data-history" data-toggle="tab" data-type="import_data_history">История импорта из 1С</a></li>
        </ul>
        <div id="data-body" class = "data-body">
          <div style = " padding: 10px; margin-bottom: 20px;">
            <!--change view type-->
            <select class="ddl-view-type" style="width: 150px; margin-right: 10px;">
              <option value="volumes">Объемы</option>
              <option value="prices">Стоимость</option>
            </select>
            <!--Info groupper-->
            <div class='pnl-ddl input-append pnl-ddl-groupby' style='position: relative;'>
              <span class = "lbl-group-by-note" style=" color: #999; font-size: 10px; position: absolute; bottom: -30px; display: none;">
                Изменяйте порядок позиций списка или отключайте их,<br>чтобы перегруппировать список
              </span>
              <select class="ddl-groupby" multiple="multiple" style = "display:none">
                <option value="order_number" class = "order_number">Заказам</option>
                <option value="sector_code" class = "sector_code">Участкам</option>
                <option value="material_group_key" class = "material_group_key">Группам материалов</option>
              </select>
            </div>

            <!--Show/Hide columns-->
            <div class='pnl-ddl input-append pnl-ddl-columns' style='position: relative;'>
              <select class="ddl-columns" multiple="multiple" style = "display:none">
                <option value="order_number">Заказ</option>
                <option value="material_group_key">Группа материалов</option>
                <option value="material_key">Код</option>
                <option value="material_name">Название</option>
                <option value="unique_props_name">Х-ки</option>
                <option value="note">Примечание</option>
                <option value="unit_pto">Ед.</option>
                <option value="pto_size">Объем</option>
                <option value="price">Цена без НДС</option>
                <option value="pto_size_confirmed">Согласовано</option>
                <option value="inpay">В оплате</option>
                <option value="payed">Оплачено</option>
                <option value="onstore">На складе</option>
                <option value="onwork">Отгружено</option>
                <option value="not_onwork">Не отгружено</option>
                <option value="not_payed">Требуется оплата</option>
              </select>
            </div>
            <span class = "lnk lnk-maximize" data-val = "min" style="float: right; margin: 5px" >развернуть</span>
            <span class = "delimetr" style="float: right; margin-top: 5px;">|</span>
            <span class = "lnk btn-collapse" style="float: right; margin: 5px;" data-state = "collapsed">
              <i class="fa fa-folder"></i>&nbsp;Раскрыть группы
            </span>
          </div>
          <div id="data-body-container" class="dataTables_wrapper"></div>
        </div>
        <div id="mto-import-data-history" style="display: none;"></div>
      </div>
    </div>
  </div>
</div>
