%def scripts():
 <script>$(function() {});</script>
%end
%rebase master_page/error page_title='Ошибка ' + str(error_code), current_user=current_user, version=version, scripts=scripts, menu=menu, error_code=error_code, error_message=error_message
<style>
  h3{font-size: 16px; }
  .err{
    font-size:24px;
    color:#c00;
    float:left;
    width:100%;
    text-align:center;
    margin:20px 0;
  }
</style>
<span class = "err">{{error_message}}</span>
