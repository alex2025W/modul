%def scripts():
  <link href="/frontend/work_order_cancel_shift/styles/work_order_cancel_shift.css" rel="stylesheet" media="screen">
  <script>
    $(function(){
      // проверка на заполненность поля коментария
      var shift_key = "{{!params['key']}}";
      var shift_header = "{{!params['note']}}";
      var shift_comment = '';
      $('.btn-transfer-data').click(function(e){
          shift_comment = $('.tb-comment').val();
          if(!shift_comment){
            $.jGrowl('Заполните причину отмены корректировки. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            return;
          }
          // отправка данных на сервер
          Routine.showLoader();
          $.ajax({
            type: "POST",
            url: "/handlers/workorderdate/cancel_shift/",
            data: JSON.stringify({
              'shift_key': shift_key,
              'shift_header': shift_header,
              'shift_comment': shift_comment
            }),
            timeout: 55000,
            contentType: 'application/json',
            dataType: 'json',
            async:true
            }).done(function(result) {
              if(result['status']=="error")
                $.jGrowl(result['msg']?result['msg']:'Ошибка сохранения данных. Повторите попытку.' , { 'themeState':'growl-error', 'sticky':false, life: 10000 });
              else
              {
                $.jGrowl('Корректировка успешно отменена.' , { 'themeState':'growl-success', 'sticky':false, life: 10000 });
                $('.btn-transfer-data').prop('disabled', true);
                $('.tb-comment').prop('disabled', true);
              }
            }).error(function(){
              $.jGrowl('Ошибка сохранения данных. Повторите попытку. ', { 'themeState':'growl-error', 'sticky':false, life: 5000 });
            }).always(function(){Routine.hideLoader();});
      });
    });
  </script>
%end
%rebase master_page/base page_title='Наряды. Отмена корректировки', current_user=current_user, version=version, scripts=scripts,menu=menu, params = params
<div id="cancelshift-page" class="span12">
  <div class="row">
     <div class="span14 tb-header">
      <input type="hidden" value = "{{!params['key'] }}" class = "transfer-key" />
      <span class="transfer-header font14"><b>{{!params['note'] }}</b></span>
     </div>
  </div>
  <div class="row" style = "margin-top:25px;">
    <div class="span12">
      <label>Причина отмены корректировки<br>
        <textarea name="transfer_comment" id="transfer-comment" class="span12 tb-comment" rows = "3"></textarea>
      </label>
    </div>
  </div>
  <div class="row">
    <div class="span12 text-right">
      <button class="btn btn-transfer-data">&nbsp;&nbsp;&nbsp;OK&nbsp;&nbsp;&nbsp;</button>
    </div>
  </div>

</div>
