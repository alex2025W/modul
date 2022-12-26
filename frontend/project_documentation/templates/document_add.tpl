<script type="text/template" id="documentAddDlgTemplate">
  <div class="document-add-dlg">
    <fieldset class="form-horizontal">
      <div class="control-group">
        <label class="control-label">Заказ</label>
        <div class="controls">
          <select class="orders-list">
            <option value="">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</option>
            <% for(var i in App.models['orders']) {
              var item = App.models['orders'][i]; %>
              <option value = "<%=item%>"><%=item%></option>
            <% } %>
          </select>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label">Раздел</label>
        <div class="controls">
          <select class="section-list">
            <option value="">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</option>
            <% App.models['sectors'].map(function(item){ %>
              <option value="<%= item['_id'] %>"><%= item['name'] %></option>
            <% }); %>
          </select>
        </div>
      </div>
      <div class="control-group stage-gr">
        <label class="control-label">Стадия</label>
        <div class="controls">
          <label class="radio"><input type="radio" name="add-stage" value="П"> П</label>
          <label class="radio"><input type="radio" name="add-stage" value="Р"> Р</label>
        </div>
      </div>
      <div class="linked-files"  >
        <div class="line-header">
          <span class="lbl_header" style="font-size: 22px; ">Файлы документов</span><br>
        </div>
        <div class="empty-text">
          <em>Для загрузки документов укажите заказ</em>
        </div>
        <div class="upload-data-manager" style="display: none;">
          <div class="new-files-pdf"></div>
          <div class="source-files"></div>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label"></label>
        <div class="controls">
          <label class="checkbox"><input type="checkbox" class="is_customer_agree"> Согласовано заказчиком</label>
        </div>
      </div>
      <div class="control-group">
        <label class="control-label">Примечание</label>
        <div class="controls">
          <textarea class="description"></textarea>
        </div>
      </div>
      <div class="buttons">
        <button class="btn btn-success save-btn">Сохранить</button>
        <button class="btn btn-danger close-btn">Закрыть</button>
      </div>
    </fieldset>
  </div>
</script>
