<script id="ViewBulkDataInsertDialogTemplate" type="text/template">
  <div class="modal bulk-data-insert-dlg">
    <div class="modal-header">
      <button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
      <h5>Вставить значения</h5>
    </div>
    <div class="modal-body form-horizontal">
      <textarea class="tb span5 tb-value" rows="12"></textarea>
      <div class="lbl-hint">
        Заполните объемы. Каждое значение должно идти с новой строки. Объемы по порядку прмиенятся к теблице для данных со статусом - "В расчете".
      </div>
    </div>
    <div class="modal-footer">
      <div class="control-group">
        <div class="controls">
          <a href="javascript:;" class="btn btn-primary btn-save" disabled>Выполнить</a>
          <a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Отмена</a>
        </div>
      </div>
    </div>
  </div>
</script>
