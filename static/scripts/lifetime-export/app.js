$(() => {

    const validate_date_input = ($input) => {
        if ($input.is('.date-type')) {
            return /^\d\d\.\d\d\.\d\d\d\d$/.test($input.val().trim()) && moment($input.val().trim(), 'DD.MM.YYYY').isValid();
        }
        return /^\d+$/.test($input.val().trim().replace('-', ''));
    };

    const validate_order_id_list = ($input) => {
        const input_text = $input.val().trim().replace(/\s/g, '');
        if (input_text === '') {
            return true;
        } else {
            return /^((\d+),?)+$/.test(input_text)
        }
    }

    String.prototype.trim = function () {
        return this.replace(/^[\_\s]+|[\_\s]+$/gm, '');
    };

    const DATE_FORMAT = "DD.MM.YYYY";
    const DATE_FORMAT_BACKEND = "YYYY-MM-DD";
    const TODAY_DATE = moment();
    const START_OF_YEAR = moment().startOf('year').subtract(1, "year");

    const $dateInputs = $('input.date-type');
    const $orderIdInput = $('input[name=order-ids]');
    const $dateFrom = $('input[name=date-from]');
    const $dateTo = $('input[name=date-to]');

    $dateInputs.mask('99.99.9999');
    $dateFrom.val(START_OF_YEAR.format(DATE_FORMAT));
    $dateTo.val(TODAY_DATE.format(DATE_FORMAT));
    $dateInputs.datepicker({
        format: 'dd.mm.yyyy',
        autoclose: true,
        language: 'ru',
        orientation: "top right"
    });

    $('input[name=send]').on('click', () => {
        if (validate_order_id_list($orderIdInput) === false) {
            show_error('Неправильный формат списка номеров. Пожалуйста, перечислите номера заявок через запятую.');
            return;
        }

        if (validate_date_input($dateFrom) === false || validate_date_input($dateTo) === false) {
            console.error('Некорректный формат даты');
            return;
        }

        const orderIdList = $orderIdInput.val().trim().replace(/\s/g, '');
        const dateFrom = moment($dateFrom.val().trim(), DATE_FORMAT).format(DATE_FORMAT_BACKEND);
        const dateTo = moment($dateTo.val().trim(), DATE_FORMAT).format(DATE_FORMAT_BACKEND);

        document.location = `/stats/crm/lifetime?from=${dateFrom}&to=${dateTo}&orders=${orderIdList}`;
    })
});
