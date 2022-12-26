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

    const MIN_CHART_DATASET_VALUE = 15;

    let data_interval;
    let chart;

    const randInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    const timestamp_to_date = (timestamp, format) => {
        return moment.unix(timestamp).format(format);
    }

    const last_update_set = (target_id) => {
        $(`#${target_id}`).text(moment().format('DD.MM.YYYY HH:mm'));
    }

    function buildTable(header, rows) {
        const $table = $('#chart-table');

        let table_content = '';
        for (let i = 0; i < rows.length; i++) {
            table_content += `
              <tr>
                <td>${rows[i]}</td>
                <td>${header[i]}</td>
              </tr>
            `;
        }

        $table.find('tbody').html(table_content);
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

    async function processData(dateFrom, dateTo) {
        $('.finder-loader').css('display', 'block');

        clearInterval(data_interval);

        const endpoints = [
            new URL(`${window.location.protocol}//${window.location.hostname}/sales-funnel/api/statuses`),
        ]

        for (let endpoint of endpoints) {
            if (dateFrom !== undefined) {
                endpoint.searchParams.append('date_from', dateFrom)
            }
            if (dateTo !== undefined) {
                endpoint.searchParams.append('date_to', dateTo)
            }
        }

        data_interval = setInterval(() => {
            fetchURLArray(endpoints)
                .then((result) => {
                    let [sales_funnel] = result;
                    let sales_funnel_values = [];
                    let labels = [];

                    for (let row of sales_funnel) {
                        labels.push(row[1]);
                        sales_funnel_values.push(row[0]);
                    }

                    buildTable(labels, sales_funnel_values);

                    if (chart !== undefined) {
                        chart.destroy();
                        chart = undefined;
                    }

                    chart = render_bar_chart(
                        plannedCtx,
                        labels,
                        [
                            {
                                label: 'Воронка продаж',
                                data: sales_funnel_values,
                                borderColor: COLORS.blue,
                                backgroundColor: COLORS.blue,
                                pointRadius: 5,
                                pointHoverRadius: 10,
                                datalabels: {
                                    align: 'center',
                                    anchor: 'center'
                                }
                            },
                        ]
                    )
                    clearInterval(data_interval);
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
                plugins: [ChartDataLabels],
                options: {
                    legend: {
                        display: false
                    },
                    plugins: {
                        datalabels: {
                            color: 'white',
                            display: function(context) {
                              return context.dataset.data[context.dataIndex] > MIN_CHART_DATASET_VALUE;
                            },
                            font: {
                                weight: 'bold'
                            },
                        }
                    },
                    responsive: true
                }
            }
        );
    }

    // HTTP query delay interval in milliseconds
    const DEFAULT_QUERY_DELAY_MIN = 3000;
    const DEFAULT_QUERY_DELAY_MAX = 4000;

    const DATE_FORMAT = "DD.MM.YYYY";
    const DEFAULT_DATE_TO = moment().format(DATE_FORMAT);

    const plannedCtx = document.getElementById('data-chart');

    const $dateInputs = $('input.date-type');
    const $dateFrom = $('input[name=date-from]');
    const $dateTo = $('input[name=date-to]');

    $dateInputs.datepicker({
        format: 'dd.mm.yyyy',
        autoclose: true,
        language: 'ru',
        orientation: "top right"
    });

    $dateTo.val(DEFAULT_DATE_TO);

    processData(undefined, moment($dateTo.val().trim(), DATE_FORMAT).unix())
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
            dateFrom = moment($dateFrom.val().trim(), DATE_FORMAT).unix();
        }

        const dateToVal = $dateTo.val().trim();
        if (dateToVal === undefined || dateToVal === '') {
            dateTo = undefined;
        } else {
            dateTo = moment($dateTo.val().trim(), DATE_FORMAT).unix();
        }

        processData(dateFrom, dateTo)
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
