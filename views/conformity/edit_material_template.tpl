<!--ФОРМА РЕДАКТИРОАНИЯ/ДОБАВЛЕНИЯ МАТЕРИАЛА-->
<script id="editMaterialTemplate" type="text/template">
      <table class= "edit-box">
        <thead>
          <tr class = "head">
            <td colspan = "2">Материал:</td>
          </tr>
        </thead>
        <tbody>
        <tr>
            <td class = "left">Код материала:</td>
            <td class = "right"><input class = "tb tb_code" type = "text" value = "<%=code%>"  disabled /></td>
          </tr>
          <tr>
            <td class = "left">Группа:</td>
            <td class = "right">
                <select class="tb ddl_group" <%=_id?'disabled':''%>>
                    <option value="">Укажите группу</option>
                    <% _(materials_groups).each(function(row) {%>
                        <option value="<%= row['code'] %>" <%=row['code'].toString()==group_code.toString()?'selected':''%> ><%= '['+row['code'] + '] '+row['name'] %></option>
                    <% }); %>
                </select>
            </td>
          </tr>
          <tr>
            <td class = "left">Материал:</td>
            <td class = "right"><input class = "tb tb_name" type = "text" value = "<%=Routine.stripTags(name)%>" /></td>
          </tr>
          <tr>
            <td class = "left">Цена:</td>
            <td class = "right"><input class = "tb is_money tb_price" type = "text" value = "<%=Routine.floatToStr(price)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Дата цены:</td>
            <td class = "right"><input class = "tb is_date tb_price_date" type = "text" value = "<%=price_date%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Ед. измерения закупок:</td>
            <td class = "right"><input class = "tb tb_unit_purchase" autocomplete="off" type = "text" value = "<%=unit_purchase%>" style = "width:150px;" /></td>
          </tr>
          <tr>
            <td class = "left">Значение Ед. измерения закупок:</td>
            <td class = "right"><input class = "tb is_float tb_unit_purchase_value" type = "text" value = "<%=Routine.floatToStr(unit_purchase_value)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Ед. измерения ПТО:</td>
            <td class = "right"><input class = "tb tb_unit_pto" type = "text" value = "<%=unit_pto%>"  style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Значение Ед. измерения ПТО:</td>
            <td class = "right"><input class = "tb is_float tb_unit_pto_value" type = "text" value = "<%=Routine.floatToStr(unit_pto_value)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Выпускающий участок:</td>
            <td class = "right">
                <select class="tb ddl_out_sector">
                    <option value="">Укажите участок</option>
                    <% _(sectors).each(function(row) { %>
                        <option value="<%= row['_id'] %>" <%=row['_id']==out_sector_id?'selected':''%> ><%= '['+row['code'] + '] '+row['name'] %></option>
                    <% }); %>
                </select>
            </td>
          </tr>
          <tr>
            <td class = "left">Участок-изготовитель:</td>
            <td class = "right">
               <select class="tb ddl_manufact_sector">
                  <option value="">Укажите участок</option>
                  <% _(sectors).each(function(row) { %>
                      <option value="<%= row['_id'] %>" <%=row['_id']==manufact_sector_id?'selected':''%> ><%= '['+row['code'] + '] '+row['name'] %></option>
                  <% }); %>
              </select>
            </td>
          </tr>
          <tr>
            <td class = "left">Название ЕСХ:</td>
            <td class = "right"><input class = "tb tb_sku_name" type = "text" value = "<%=sku_name%>"  style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Пропорция ЕСХ к объёму ПТО:</td>
            <td class = "right"><input class = "tb is_float tb_sku_pto_proportion" type = "text" value = "<%=Routine.floatToStr(sku_pto_proportion)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Объём поставки:</td>
            <td class = "right"><input class = "tb is_float tb_delivery_size" type = "text" value = "<%=Routine.floatToStr(delivery_size)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Минимальный срок поставки(раб.дн):</td>
            <td class = "right"><input class = "tb is_int tb_delivery_time_min" type = "text" value = "<%=delivery_time_min%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Макисмальный срок поставки (раб. дн.):</td>
            <td class = "right"><input class = "tb is_int tb_delivery_time_ma[" type = "text" value = "<%=delivery_time_max%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Стоимость доставки (руб.):</td>
            <td class = "right"><input class = "tb is_money tb_delivery_price" type = "text" value = "<%=Routine.floatToStr(delivery_price)%>" style = "width:150px;"/></td>
          </tr>
          <tr>
            <td class = "left">Пометка:</td>
            <td class = "right"><textarea class="tb span5 tb_note" rows="3"><%=note%></textarea></td>
          </tr>
          <tr>
            <td class = "left"></td>
            <td class = "right">
              <label class="checkbox" title = "Активирован" style = "margin-left:0px;">
                  <input type="checkbox" style = "padding-left:0px;" class="cb_active" <%=is_active?'checked':''%>  style = "margin:3px 0px 0px 0px;" />&nbsp;Активирован
              </label>
            </td>
          </tr>
          <tr class = "head">
            <td colspan = "2">
              <ul class="nav nav-tabs" style = "font-size:12px; margin-top:10px;">
                    <li class="active"><a href="#tab-active-props" data-toggle="tab">Активные характеристики</a></li>
                    <li><a href="#tab-not-active-props" data-toggle="tab">Неактивные(отключенные) характеристики</a></li>
              </ul>
            </td>
          </tr>
          <tr>
            <td colspan = "2" class = "unique-props-data-container">

                <div class="tabbable">
                    <div class="tab-content" style = "overflow:initial;">
                        <div class="tab-pane active" id="tab-active-props">
                            <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td style = "width:5%">Код</td>
                                        <td style = "width:85%">Название</td>
                                        <td style = "width:5%"></td>
                                    </tr>
                                </thead>
                                <tbody class = "data-list"></tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="4" style = "text-align:left; padding-left:0px;">
                                            <button  class="btn btn-add-unique-prop" style = "margin:0px 0px 3px 0px;">
                                                <i class="fa fa-plus"></i>&nbsp;&nbsp;Добавить
                                            </button>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div class="tab-pane" id="tab-not-active-props">
                            <table class = 'in-info'>
                                <thead>
                                    <tr>
                                        <td style = "width:5%">Код</td>
                                        <td style = "width:85%">Название</td>
                                        <td style = "width:5%"></td>
                                    </tr>
                                </thead>
                                <tbody class = "data-list"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td class = "left"></td>
            <td class = "right">
                <button  class="btn btn-copy" style = "margin:0px 0px 3px 0px; <%=_id?'':'display:none;'%>">
                    <i class="fa fa-copy"></i>&nbsp;&nbsp;Сделать копию
                </button>
                <button  class="btn btn-save" style = "margin:0px 0px 3px 10px;">
                    <i class="fa fa-save"></i>&nbsp;&nbsp;Сохранить
                </button>
            </td>
          </tr>
        </tfoot>
      </table>
</script>

<!--ЭЛЕМЕНТ ИНДИВИДУАЛЬНОЙ ХАРАКТЕРИСТИКИ-->
<script id="uniquePropsItemTemplate" type="text/template">
  <td><%=key%></td>
  <td><input class = "tb tb_unique_prop_name" type = "text" value = "<%=name%>" <%=type=='preset'?'disabled':''%> /></td>
  <td>
      <%if(is_active){%>
       <button value = "hide" class="btn btn-remove-unique-prop" style = "margin:0px 0px 3px 2px; " title="Удалить характеристику" >
          <i class="fa fa-times"></i>
      </button>
     <%}else{%>
      <button value = "hide" class="btn btn-repair-unique-prop" style = "margin:0px 0px 3px 2px; " title="Восстановить  характеристику"  >
          <i class="fa fa-check"></i>
      </button>
     <%}%>
  </td>
</script>
