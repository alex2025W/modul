%def scripts():
<script src="/static/scripts/order-export/app.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Выгрузка заявок', current_user=current_user, version=version, scripts=scripts, menu=menu
<style>
    h3 {
        font-size: 16px;
    }

    .italic {
        font-style: italic;
    }

    input[name=order-ids] {
      width: 100%;
    }

    .input-container {
      margin: .5em 0;
    }
</style>
<div id="date-calculators">
  <div class="span12 italic"></div>
  <article>
      <div class="span12" style="margin-top:20px;">
        <h3>Выгрузка заявок</h3>
      </div>
      <div class="span12" style="margin-top:20px;">
        <form data-operator="date_plus_day" class="form-inline calc-form">
          <div class="input-container">
            <input type="button" name="send" class="btn btn-warning" value="Выгрузить">
          </div>
        </form>
      </div>
  </article>
</div>
