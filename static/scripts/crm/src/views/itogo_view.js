
/**
* блок Итого
*/

var itogoTemplate2 = require('../templates/itogo_template.html');
var itogoItemTemplate2 = require('../templates/itogo_item_template.html');
var itogoTotalTemplate2 = require('../templates/itogo_total_template.html');

var ItogoView = Backbone.View.extend({
        filter: null,
        tagName:'div',
        className: 'span12',
        initialize: function(){
            this.template = itogoTemplate2;
            this.render();
        },
        render:function(){
            var self = this;
            this.$el.html(this.template());
            var total = {'ncount':0, 'nsumm':0, 'nsq':0, 'nav':0, 'navc':0, 'ocount':0, 'osumm':0, 'osq':0, 'oav':0, 'oavc':0};
            _.each(self.collection.models, function(item){

                var ln =  itogoItemTemplate2;
                item.set({'total': window.App.summaryCount.total});
                self.$('.itogo-table1').append(ln(item.toJSON()));

                total.ncount += item.get('new_count');
                total.nsumm += item.get('new_price');
                total.nsq += item.get('new_sq');
                total.nav += item.get('new_aver');
                total.navc += item.get('new_aver')>0?1:0;

                total.ocount += item.get('old_count');
                total.osumm += item.get('old_price');
                total.osq += item.get('old_sq');
                total.oav += item.get('old_aver');
                total.oavc += item.get('old_aver')>0?1:0;
            });
            var tt = itogoTotalTemplate2;
            self.$('.itogo-table1').append(tt(total));

            if (window.App.clients != null){
                this.$('.new-clients').text(window.App.clients['new']);
                this.$('.old-clients').text(window.App.clients['old']);
                this.$('.rec-clients').text(window.App.clients['rec']);
            }
            var odf = window.App.filters.od;
            var period = '';
            switch(odf){
                case '':
                case '30days':
                    period = ' за 30 дней';
                    break;
                case 'all':
                    period = ' за 30 дней';
                    break;
                case 'today':
                    period = ' за сегодня';
                    break;
                case 'yesterday':
                    period = ' за вчера';
                    break;
                case '7days':
                    period = ' за 7 дней';
                    break;
                default:
                    period = ' за '+odf;
            }
            this.$('.period').text(period);
            return this;
        },
        close:function(){
            //this.$el.hide();
            this.$el.empty();
            this.undelegateEvents();
            this.$el.removeData().unbind();
        }
    });

module.exports = ItogoView;