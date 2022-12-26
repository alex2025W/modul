var ChangeSpecificationView = Backbone.View.extend({
    el: $("#container"),
    result_table: $('.table-result'),
    events:{
        'click .btn-save':'onSave'
    },
    initialize:function(){
        this.template  = _.template($('#tableRowTemplate').html());
    },

    clearTable: function(){
        this.result_table.find('tbody').html('');
    },
    onSave:function(){
        var self = this;
        var data = $('.tb-data').val();
        if (!data) {
            Routine.showMessage('Заполните данные', 'error');
            return;
        }
        Routine.showLoader();
        self.clearTable();
        $.ajax({
            url: '/handlers/esudspecification/update_config_props',
            type: 'POST',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            data: data,
            timeout: 35000,
        }).done(function(result) {
            if(result['status']=="error")
                Routine.showMessage(result['msg'], 'error');
            else
            {
                result = result['data'];
                for (var i=0; i < result.length; i++){
                    self.result_table.find('tbody').append(_.template($('#tableRowTemplate').html())(result[i]));
                }
                Routine.showMessage('Данные обновлены', 'success');
            }
        }).error(function(){
            Routine.showMessage('Ошибка обновления данных. Повторите попытку.', 'error');
        }).always(function(){Routine.hideLoader();});
    }
});

var AppView = Backbone.View.extend({
    initialize:function(){
        var self = this;
        self.changeSpecificationView = new ChangeSpecificationView();
    }
});

