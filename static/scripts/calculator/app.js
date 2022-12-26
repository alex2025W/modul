$(() => {

  const validate = ($input) => {
    if ($input.is('.date-type')){
      return /^\d\d\.\d\d\.\d\d\d\d$/.test($input.val().trim()) && moment($input.val().trim(), 'DD.MM.YYYY').isValid();
    }
    return /^\d+$/.test($input.val().trim().replace('-',''));
  };

  String.prototype.trim = function(){ return this.replace(/^[\_\s]+|[\_\s]+$/gm,'')};

  const days_between_dates = (a, b) => {
    let d1 = null;
    let d2 = null;
    if(moment(a, 'DD.MM.YYYY')<=moment(b, 'DD.MM.YYYY'))
    {
     d1 = moment(a, 'DD.MM.YYYY');
     d2 = moment(b, 'DD.MM.YYYY').add(+1, 'day');
    }
    else
    {
      d2 = moment(a, 'DD.MM.YYYY').add(+1, 'day');
      d1 = moment(b, 'DD.MM.YYYY');
    }
    const m = d2.diff(d1, 'months');
    const w = d2.diff(d1, 'weeks');
    const md = d1.clone();
    md.add(m, 'months');
    const m_w = d2.diff(md, 'weeks');
    md.add(m_w, 'weeks');
    const m_w_d = d2.diff(md, 'days');

    const mw = d1.clone();
    mw.add(w, 'weeks');
    const w_d = d2.diff(mw, 'days');

    return {
      c_days:  d2.diff(d1, 'days').toString(),
      c_weeks: w === 0 ? '' : `| ${w} календ. нед.` + (w_d === 0 ? '' : ` и ${w_d} календ. дн.`),
      c_months: m === 0 ? '' :  `| ${m} календ. мес.` + (m_w === 0 && m_w_d === 0 ? '' : (m_w === 0 ? '': `, ${m_w} календ. нед.`) + (m_w_d === 0 ? '' : ` и ${m_w_d} календ. дн.`)),
  };
  };

  const date_plus_day = (a, b) => moment(a, 'DD.MM.YYYY').add(+b, 'day').format('DD.MM.YYYY');

  const print_result = ($result_field) => (result) => $result_field.text(result);

  const between_result = ({c_days, c_weeks, c_months}, w_days) => `${c_days} календ. дн. | ${w_days} раб. дн. ${c_weeks} ${c_months}`;

  const on_change_val_debounced = e => {
    const $form = $(e.target).closest('form');
    const $result = $('.result', $form);
    const $a = $('input[name=a]', $form);
    const $b = $('input[name=b]', $form);
    if (!validate($a) || !validate($b)){
      return;
    }
    const a = $a.val().trim();
    const b = $b.val().trim();
    calc(a, b, $form.data('operator'), print_result($result));
  }

  const calc = (a, b, operator, ok) => {
    switch (operator) {
      case 'days_between_dates':
          return calc_between(a, b, ok);
          //ok(days_between_dates(a, b));
        break;
      case 'date_plus_day':
          return ok(date_plus_day(a, b));
        break;
      case 'date_plus_work_day':
      case 'days_between_work_dates':
          return calc_remote(a, b, operator, ok);
        break;
      default:
        return 0;
    }
  }

  const calc_between = (a, b, ok) => {
    const c_days = days_between_dates(a, b);
    const ok2 = (c_days) => (w_days) => ok(between_result(c_days, w_days));
    calc_remote(a, b, 'days_between_work_dates', ok2(c_days));
  };

  const calc_remote = (a, b, operator, ok) => {
    return $.ajax({
        type: "POST",
        url: "/handlers/calculator",
        data: JSON.stringify({ a, b, operator, }),
        timeout: 55000,
        contentType: 'application/json',
        dataType: 'json',
        async:true,
    }).done(function(res){
        console.log(res.result);
        if(Number.isInteger(res.result))
              ok(res.result+1);
          else
            ok(res.result);
    });
  }

  const init_date = moment().format("DD.MM.YYYY");
  const init_day = 0;
  const $form_inputs = () => $('.calc-input');
  const on_change_val = _.throttle(on_change_val_debounced, 300);
  $('input.date-type').mask('99.99.9999');
  $('input.date-type').val(init_date);
  $('.date-result').text(init_date);
  //$('input.day-type').mask('9?99');
  $('input.day-type').numeric({ negative: true, decimal: '' });
  $('input.day-type').val(init_day);
  $('input.date-type').datepicker({format: 'dd.mm.yyyy', autoclose:true, language:'ru', orientation: "top right"});
  $form_inputs().on('change keyup input', on_change_val);


});
