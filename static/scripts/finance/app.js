var App = {
    Models: {},
    Views:{},
    Collections:{},
    Route:null,
    initialize:function(){
        App.Views.ContractFinance = new ContractFinanceView();
    }
};


var ContractFinanceView = Backbone.View.extend({
    el:$("#contractFinanceKaluga"),
    events:{
        'click .more-info':'onMoreInfoClick',
        'click .more-less': 'onMoreLess',
        'click .size.show-more':'onShowOrderInfo'
    },
    initialize:function(){
         this.template = _.template($('#contractFinanceTemplate').html());
        this.loadData();
    },
    loadData:function(){
        var self = this;
        Routine.showLoader();
        $.ajax({
            url: '/handlers/contracts/get_finance_info',
            type: 'GET',
            dataType: 'json',
            contentType: "application/json; charset=utf-8",
            timeout: 35000,
            success: function (result, textStatus, jqXHR) {
                if(result.total.numbers)
                    result.total.numbers.sort(function(a,b){
                        a = a+'';
                        b = b+'';
                        var na = parseInt(a.split('/')[0]);
                        var nb = parseInt(b.split('/')[0]);
                        if(na<nb) return -1;
                        if(na>nb) return 1;
                        if(a<b) return -1;
                        if(a>b) return 1;
                        return 0;
                    });
                  result.more.sort(function(a,b){
                    var na = parseInt(a.parent_number?a.parent_number:a.number);
                    var nb = parseInt(b.parent_number?b.parent_number:b.number);
                    if(na<nb) return -1;
                    if(na>nb) return 1;
                    na = a.parent_number?a.number:0;
                    nb = b.parent_number?b.number:0;
                    if(na<nb) return -1;
                    if(na>nb) return 1;
                    return 0;
                  });
                  self.model = $.extend({}, result, {'factory':'Калуга'});
                  self.render();
                  Routine.hideLoader();
            }
        }).fail(function(jqXHR, textStatus, errorThrown ) {
            $.jGrowl('Ошибка сервера:' + errorThrown, { 'themeState':'growl-error', 'sticky':false, life: 10000, 'position': 'bottom-right' });
            Routine.hideLoader();
        });
    },
    render:function(){
    	this.$el.html(this.template(this.model));
    },
    onMoreInfoClick:function(e){
        if($(e.currentTarget).data('is_shown')){
            this.$el.find(".more-info-data").slideUp();
            $(e.currentTarget).data('is_shown',false);
            $(e.currentTarget).text("Подробнее по договорам");
        }else{
            this.$el.find(".more-info-data").slideDown();
            $(e.currentTarget).data('is_shown',true);
            $(e.currentTarget).text("Свернуть");
        }
    },
    onMoreLess:function(e){
        e.preventDefault();
        var tr = $(e.currentTarget).closest("tr");
        if(tr.data('more')){
            tr.data('more',false);
            tr.find(".contracts-more").hide();
            tr.find(".contracts-less").show();
        }else{
            tr.data('more',true);
            tr.find(".contracts-more").show();
            tr.find(".contracts-less").hide();
        }
    },
    onShowOrderInfo:function(e){
        e.preventDefault();
        var td = $(e.currentTarget).closest(".ln");
        if(td.find(".orders-size").is(":visible")){
            td.find(".orders-size").hide();
        }else
        {
            td.find(".orders-size").show();
        }
    }
});


App.initialize();
