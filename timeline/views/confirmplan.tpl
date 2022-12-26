%def scripts():
    <script>
        $(function(){
            // проверка на заполненность поля коментария
            var cid = "{{! params['cid'] }}";
            var vcomments = {{! params['comments'] }};
            var shift_comment = '';
            $('.btn-transfer-data').click(function(e){
                    shift_comment = $('.tb-comment').val();
                    // отправка данных на сервер
                    var comments = vcomments.slice();
                    comments.push({'comment':shift_comment, 'type': "confirmplan", "user":MANAGER});
                    Routine.showLoader();
                    $.ajax({
                        type: "PUT",
                        url: "/timeline/api/cells",
                        data: JSON.stringify({
                            '_id': "{{! params['cid']}}",
                            'date': "{{! params.get('date')}}",
                            'node_id': "{{! params.get('node_id')}}",
                            'comments':comments
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
                                $.jGrowl('Планы успешно подтверждены.' , { 'themeState':'growl-success', 'sticky':false, life: 10000 });
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
%rebase master_page/base page_title='График производства. Подтверждение планов', current_user=current_user, version=version, scripts=scripts,menu=menu, params = params
<div id="cancelshift-page" class="span12">
    <div class="row">
         <div class="span14 tb-header">
            <span class="transfer-header font14"><b>Подтверждение планов</b></span>
         </div>
    </div>
    % if(err_text):
        <div class="error" style="padding:5px 10px;">
            {{! err_text}}
        </div>
    % else:
        <div class="row" style = "margin-top:25px;">
            <div class="span12">
                <label>Примечание (не обязательно)<br>
                    <textarea name="transfer_comment" id="transfer-comment" class="span12 tb-comment" rows = "3"></textarea>
                </label>
            </div>
        </div>
    % end
    <div class="row">
        <div class="span12 text-right">
            <button class="btn btn-transfer-data">&nbsp;&nbsp;&nbsp;OK&nbsp;&nbsp;&nbsp;</button>
        </div>
    </div>

</div>
