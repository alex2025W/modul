%def scripts():
<script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
<script src="/static/scripts/libs/bootstrap-inputmask.min.js?v={{version}}"></script>
<script src="/static/scripts/lifetime-export/app.js?v={{version}}"></script>
<script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Жизненный цикл', current_user=current_user, version=version, scripts=scripts, menu=menu
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
      <div class="span12" style="margin-top:20px;"><h3>Выгрузка жизненного цикла</h3></div>
      <div class="span12" style="margin-top:20px;">
        <form data-operator="date_plus_day" class="form-inline calc-form">
          <div class="input-container">
            <label>
              <span>Дата от</span>
              <input type="text" placeholder="Дата от" name="date-from" class="input-small date-type">
            </label>
          </div>
          <div class="input-container">
            <label>
              <span>Дата до</span>
              <input type="text" placeholder="Дата до" name="date-to" class="input-small date-type">
            </label>
          </div>
          <div class="input-container">
            <label style="width: 100%">
              <input
                type="text"
                placeholder="Список номеров заявок через запятую"
                name="order-ids"
              >
            </label>
          </div>
          <div class="input-container">
            <input type="button" name="send" class="btn btn-warning" value="Выгрузить">
          </div>
        </form>
      </div>
  </article>
</div>
