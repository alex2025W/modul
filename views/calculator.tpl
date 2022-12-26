
%def scripts():
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.min-1.4.0.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-datepicker.ru.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-inputmask.min.js?v={{version}}"></script>
  <script src="/static/scripts/calculator/app.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.numeric.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Калькулятор дат', current_user=current_user, version=version, scripts=scripts, menu=menu
<style>
  h3{font-size: 16px; }
  .italic{font-style: italic;}
</style>
<div id="date-calculators">
<div class="span12 italic">Даты включаются в расчёт. Например, с 16.06.2016 по 16.06.2016 - это 1 день; 16.06.2016 + 1 день - это 17.06.2016<br/>Количество дней может быть отрицательным числом. Это означает отсчёт от указанной даты назад. Например, [03.08.2016] [-1] означает 02.08.2016<br/>Количество дней считается со следующей даты от указанной. Например, 12.12.2016 + 3 дня = 15.12. (13.12, 14.12, 15.12)</div>
  <article>
      <div class="span12" style = "margin-top:20px;"><h3>Дата и количество дней</h3></div>
      <div class="span12">
        <form data-operator="date_plus_day" class="form-inline calc-form">
              <input type="text" name="a" class="input-small calc-input date-type">
              <input type="text" name="b" class="input-small calc-input day-type">
              <span>&nbsp;=&nbsp;</span><span><strong class="result date-result">1</strong></span>
        </form>
      </div>
  </article>

  <article>
      <div class="span12"><h3>Дата и количество рабочих дней</h3></div>
      <div class="span12">
        <form data-operator="date_plus_work_day" class="form-inline calc-form" style = "white-space:nowrap">
              <input type="text" name="a" class="input-small calc-input date-type">
              <input type="text" name="b" class="input-small calc-input day-type">
              <span>&nbsp;=&nbsp;</span><span><strong class="result date-result">1</strong></span>
        </form>
      </div>
  </article>

  <article>
      <div class="span12"><h3>Сколько дней между двумя датами?</h3></div>
      <div class="span12">
        <form data-operator="days_between_dates" class="form-inline calc-form" style = "white-space:nowrap">
          <input type="text" name="a" class="input-small calc-input date-type">
          <input type="text" name="b" class="input-small calc-input date-type">
              <span>&nbsp;=&nbsp;</span><span><strong class="result">1 календ. дн. | 1 раб. дн.</strong></span>
        </form>
      </div>
  </article>

</div>
