$(() => {
    const $sendButton = $('input[name=send]');

    function button_lock() {
        $sendButton.attr('disabled', true);
        $sendButton.attr('value', 'Запрос отправлен');
    }

    function button_unlock() {
        $sendButton.attr('disabled', false);
        $sendButton.attr('value', 'Выгрузить');
    }

    function reqListener () {
        try {
            let response_object = JSON.parse(this.responseText);
            if (response_object['status'] !== 'success') {
                button_unlock();
                show_error(response_object['data']['msg']);
            } else {
                button_unlock();
                window.location = response_object['data']['redirect_url'];
            }
        } catch (error) {
            button_unlock();
            show_error('Ошибка сервера');
        }
    }

    const req = new XMLHttpRequest();
    req.addEventListener("load", reqListener);

    $sendButton.on('click', () => {
        button_lock();
        req.open("GET", "/stats/crm/order-export");
        req.send();
    })
});
