var loginPage = {
    init:function(){
        //$('#login-submit').click(loginPage.submit);
        $('.lnk-additional').click(loginPage.showAdditional);

    },
    showAdditional: function(){
        if($('.pnl-inner-enter').is(':visible'))
            $('.pnl-inner-enter').hide();
        else
            $('.pnl-inner-enter').show();
    },
    submit:function(){
        var data = new Object();
        data.phone = $('#login-phone').val();
        data.password = $('#login-password').val();
        $.ajax({
                url: '/handlers/login',
                type: 'POST',
                dataType: 'json',
                contentType: "application/json; charset=utf-8",
                data: $.toJSON(data),
                timeout: 35000,
                error: function (jqXHR, textStatus, errorThrown) {

                },
                success: function (result, textStatus, jqXHR) {
                    alert('ok');
                }
            });
    }
}
$(function(){
    loginPage.init();
});
