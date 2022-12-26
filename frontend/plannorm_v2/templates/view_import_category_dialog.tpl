<script id="ImportCategoryDialogView" type="text/template">
  <div class="modal import-category-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Импорт/Экспорт расчетов</h5>
    </div>
    <div class="modal-body form-horizontal">
      <div class = "line">
          <label class="radio"><input type="radio" name="operation-type" value="export" />
            Экспортировать расчеты
          </label>
          <label class="radio"><input type="radio" name="operation-type" value = "import" />
            Импортировать расчеты
          </label>
      </div>
      <div class = "line">
        <div class="lbl-hint" style="padding-top:5px; display: inline-block;">
            Вы можете загрузить (импортировать) расчеты из существующего документа.
            <br> Также вы можете копировать (экспортировать) текущие расчеты в другие документы. Все данные по старым расчетам будут перезаписаны.
        </div>
      </div>
      <div class = "line" style="margin-top:20px;">
          <span class="lbl">Направление:</span><br/>
        <select class="ddl ddl-sector" data-type="sector">
          <option value="">Все</option>
            <% for(var i in groupsList) { %>
              <option
                value="<%= groupsList[i]['_id'] %>">
                <%= groupsList[i]['name'] %>
              </option>
            <% } %>
        </select>
      </div>
      <div class = "line" style="margin-top:10px;">
        <span class="lbl">Категория:</span><br/>
        <select class="ddl ddl-category" data-type="category">
          <option value="">Все</option>
        </select>
      </div>
      <div class = "line" style="margin-top:10px;">
        <span class="lbl">Группа:</span><br/>
        <select class="ddl ddl-group" data-type="group">
          <option value="">Все</option>
        </select>
      </div>

      <div style = "float:left; margin-top:20px;" class="pnl-search-object">
        <span class="lbl-order-number" >Номер документа:</span>
        <input type="text" class="tb-search-object" style="width: 100px;"/>
        <div class="lbl-hint">
          Введите номер заявки, заказа или шаблона расчета для импорта/экспорта данных
        </div>
      </div>

    </div>
    <div class="modal-footer">
      <div class="control-group">
        <div class="controls">
          <a href="javascript:;" class="btn btn-primary btn-save">Выполнить</a>
          <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
        </div>
      </div>
    </div>
  </div>
</script>
