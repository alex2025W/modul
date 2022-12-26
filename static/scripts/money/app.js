/**
 * Number.prototype.format(n, x, s, c)
 *
 * @param integer n: length of decimal
 * @param integer x: length of whole part
 * @param mixed   s: sections delimiter
 * @param mixed   c: decimal delimiter
 */
Number.prototype.format = function(n, x, s, c) {
    var re = '\\d(?=(\\d{' + (x || 3) + '})+' + (n > 0 ? '\\D' : '$') + ')',
      num = this.toFixed(Math.max(0, ~~n));

    return (c ? num.replace('.', c) : num).replace(new RegExp(re, 'g'), '$&' + (s || ','));
};

$(() => {
    const COLORS = {
        red: 'rgb(186,24,27)',
        alfa_red: 'rgba(186,24,27, .5)',
        blue: 'rgb(4,102,200)',
        alfa_blue: 'rgba(4,102,200, .5)',
        green: 'rgb(0,128,0)',
        alfa_green: 'rgba(0,128,0, .5)',
        white: 'rgb(255,255,255)',
    }

    let planned_data_interval;

    const randInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    const timestamp_to_date = (timestamp, format) => {
        return moment.unix(timestamp).format(format);
    }

    const last_update_set = (target_id) => {
        $(`#${target_id}`).text(moment().format('DD.MM.YYYY HH:mm'));
    }

    function buildTable(data) {
        const table_id = 'chart-table';
        let table_content = '';
        const total = { incomes: 0, expenses: 0 };
        for (let date of Object.keys(data)) {
            if (Number(data[date]['planned_incomes'])) total.incomes += Number(data[date]['planned_incomes']);
            if (Number(data[date]['planned_expenses'])) total.expenses += Number(data[date]['planned_expenses']);
            table_content += `
              <tr>
                <td>${date}</td>
                <td>${data[date]['planned_incomes'] ? Number(data[date]['planned_incomes']).format(2, 3, ' ', '.') : ''}</td>
                <td>${data[date]['planned_expenses'] ? Number(data[date]['planned_expenses']).format(2, 3, ' ', '.') : ''}</td>
                <td>${data[date]['planned_balance'] ? Number(data[date]['planned_balance']).format(0, 3, ' ', '.') : ''}</td>
              </tr>
            `;
        }
        table_content += `
            <tr style="font-weight: bold">
                <td>ИТОГО:</td>
                <td>${total.incomes.format(2, 3, ' ', '.')}</td>
                <td>${total.expenses.format(2, 3, ' ', '.')}</td>
                <td></td>
              </tr>
        `;
        $('#'+table_id).find('tbody').html(table_content);
    }

    const make_request = (method, url) => {
        return new Promise(function (resolve, reject) {
            // setTimeout used because it's workaround of backend issue.
            // Fast parallel HTTP queries performs 500 server status code.
            // So here we are making small random delay between queries
            setTimeout(() => {
                let xhr = new XMLHttpRequest();
                xhr.open(method, url);

                xhr.onload = function () {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        let response_json;
                        try {
                            response_json = JSON.parse(xhr.response)
                        } catch (e) {
                            console.error(`Unable to parse response JSON: "${xhr.response}"`)
                            response_json = JSON.parse('{}')
                        }
                        resolve(response_json);
                    } else {
                        reject({
                            status: xhr.status,
                            statusText: xhr.statusText
                        });
                    }
                };

                xhr.onerror = function () {
                    reject({
                        status: xhr.status,
                        statusText: xhr.statusText
                    });
                };

                xhr.send();
            }, randInt(DEFAULT_QUERY_DELAY_MIN, DEFAULT_QUERY_DELAY_MAX))
        });
    }

    async function fetchURLArray(url_array) {
        let promises = [];

        for (let url of url_array) {
            promises.push(make_request('GET', url));
        }

        return await Promise.all(promises)
    }

    async function processPlannedData(dateFrom, dateTo) {
        $('.finder-loader').css('display', 'block');

        clearInterval(planned_data_interval);

        const endpoints = [
            new URL(`${window.location.protocol}//${window.location.hostname}/money/api/planned-expenses`),
            new URL(`${window.location.protocol}//${window.location.hostname}/money/api/planned-incomes`),
            new URL(`${window.location.protocol}//${window.location.hostname}/money/api/planned-balance`),
        ]

        for (let endpoint of endpoints) {
            if (dateFrom !== undefined) {
                endpoint.searchParams.append('date_from', dateFrom)
            }
            if (dateTo !== undefined) {
                endpoint.searchParams.append('date_to', dateTo)
            }
        }


        planned_data_interval = setInterval(() => {
            fetchURLArray(endpoints)
                .then((result) => {
                    let [planned_expenses, planned_incomes, planned_balance] = result;

                    if (planned_expenses.length === 0) {
                        console.warn('Плановые расходы не найдены на выбранный период');
                    } else {
                        if (planned_incomes.length === 0) {
                            console.warn('Плановые доходы не найдены на выбранный период');
                        } else {
                            if (planned_balance.length === 0) {
                                console.warn('Плановый баланс не найден на выбранный период');
                            }
                        }
                    }

                    let data = {};

                    // used just for sorting by int array of labels
                    let labels_as_timestamp = [];

                    let labels_as_string = [];
                    let planned_expenses_chart_values = [];
                    let planned_incomes_chart_values = [];
                    let planned_balance_chart_values = [];

                    for (let row of [...planned_expenses, ...planned_incomes, ...planned_balance]) {
                        if (!labels_as_timestamp.includes(row[1])) {
                            labels_as_timestamp.push(row[1])
                        }
                    }

                    labels_as_timestamp.sort()

                    for (let date of labels_as_timestamp) {
                        labels_as_string.push(timestamp_to_date(date, DATE_FORMAT))
                    }

                    for (let date of labels_as_string) {
                        if (!data.hasOwnProperty(date)) {
                            data[date] = {
                                'planned_expenses': 0,
                                'planned_incomes': 0,
                                'planned_balance': 0,
                            };
                        }
                    }

                    for (let row of planned_expenses) {
                        let amount = row[0];
                        let date = timestamp_to_date(row[1], DATE_FORMAT);
                        data[date]['planned_expenses'] += amount
                    }

                    for (let row of planned_incomes) {
                        let amount = row[0];
                        let date = timestamp_to_date(row[1], DATE_FORMAT);
                        data[date]['planned_incomes'] += amount
                    }

                    for (let row of planned_balance) {
                        let amount = row[0];
                        let date = timestamp_to_date(row[1], DATE_FORMAT);
                        data[date]['planned_balance'] = amount;
                    }

                    for (let date in data) {
                        planned_expenses_chart_values.push(data[date]['planned_expenses']);
                        planned_incomes_chart_values.push(data[date]['planned_incomes']);
                        planned_balance_chart_values.push(data[date]['planned_balance']);
                    }

                    buildTable(data);

                    if (plannedChart !== undefined) {
                        plannedChart.destroy();
                        plannedChart = undefined;
                    }

                    plannedChart = render_bar_chart(
                        plannedCtx,
                        labels_as_string,
                        [
                            {
                                label: 'Баланс',
                                data: planned_balance_chart_values,
                                borderColor: COLORS.blue,
                                backgroundColor: COLORS.blue,
                                type: 'line',
                                yAxisID: 'y1',
                                pointStyle: 'circle',
                                pointRadius: 5,
                                pointHoverRadius: 10,
                            },
                            {
                                label: 'Приход',
                                data: planned_incomes_chart_values,
                                borderColor: COLORS.green,
                                backgroundColor: COLORS.alfa_green,
                                pointStyle: 'circle',
                                pointRadius: 5,
                                pointHoverRadius: 10,
                                yAxisID: 'y',
                            },
                            {
                                label: 'Расходы',
                                data: planned_expenses_chart_values,
                                borderColor: COLORS.red,
                                backgroundColor: COLORS.alfa_red,
                                pointStyle: 'circle',
                                pointRadius: 5,
                                pointHoverRadius: 10,
                                yAxisID: 'y',
                            },
                        ]
                    )
                    clearInterval(planned_data_interval);
                    $('.finder-loader').css('display', 'none');
                    return Promise.resolve(true)
                })
                .catch((err) => {
                    console.error(err);
                    return Promise.reject(err);
                });
        }, 5000);
    }

    const render_bar_chart = (ctx, labels, datasets) => {
        return new Chart(
            ctx,
            {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                        },
                    }
                }
            }
        );
    }

    // HTTP query delay interval in milliseconds
    const DEFAULT_QUERY_DELAY_MIN = 3000;
    const DEFAULT_QUERY_DELAY_MAX = 4000;

    const DATE_FORMAT = "DD.MM.YYYY";
    const DEFAULT_DATE_FROM = moment().format(DATE_FORMAT);

    let plannedChart;
    const plannedCtx = document.getElementById('planned-data-chart');

    const $dateInputs = $('input.date-type');
    const $dateFrom = $('input[name=date-from]');
    const $dateTo = $('input[name=date-to]');

    $dateInputs.datepicker({
        format: 'dd.mm.yyyy',
        autoclose: true,
        language: 'ru',
        orientation: "top right"
    });

    $dateFrom.val(DEFAULT_DATE_FROM);

    processPlannedData($dateFrom.val().trim())
        .then(() => {
            last_update_set('lastupdate');
        })
        .catch((err) => {
            console.error(err)
        })

    $('input[name=send]').on('click', () => {
        let dateFrom, dateTo;

        let dateFromVal = $dateFrom.val().trim();
        if (dateFromVal === undefined || dateFromVal === '') {
            dateFrom = undefined;
        } else {
            dateFrom = dateFromVal;
        }

        const dateToVal = $dateTo.val().trim();
        if (dateToVal === undefined || dateToVal === '') {
            dateTo = undefined;
        } else {
            dateTo = dateToVal;
        }

        processPlannedData(dateFrom, dateTo)
            .catch((err) => {
                console.error('Unable to render chart');
            })
    });

    $('.tabs__tab').on('click', function() {
        $(this).parent().parent().find('.active').removeClass('active');
        $(this).addClass('active');
        $(this).parent().parent().find('#'+$(this).data('target')).addClass('active');
    })
});
