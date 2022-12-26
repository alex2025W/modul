/**
 * блок итого для менеджеров
 */

var managersTemplate = require('../templates/managers_template.html');
var managersTemplateItem = require('../templates/managers_template_item.html');
var managersTotalTemplate = require('../templates/managers_total_template.html');

var ManagersView = Backbone.View.extend({
        filter: null,
        tagName:'div',
        className: 'span12',
        events:{
                'change .apply-filters': 'onApplyFiltersChange'
            },
        initialize: function(){
            this.template = managersTemplate;
            this.render();
        },
        onApplyFiltersChange: function(el){
          window.App.filters['managers'] = $(el.target).prop("checked")?1:0;
          this.trigger('changeManagersFilter');
//          window.App.filterManagers = $(el.target).prop("checked");
        },
        render:function(){
//            if (this.$el.html()){
//                this.$el.find('.managerstable').html('');
//            } else {
                this.$el.html(this.template({'apply_filters': window.App.filters['managers'], 'all_filters':window.App.filters}));
//            }

            var self = this;
//            var total = {'ncount':0, 'nsumm':0, 'nsq':0, 'nav':0, 'navc':0, 'ocount':0, 'osumm':0, 'osq':0, 'oav':0, 'oavc':0};

            var total = {'fail_ed': 0, 'fail_sq': 0, 'fail_summ': 0, 'interes_ed': 0, 'interes_sq': 0, 'interes_summ': 0,
                         'signed_ed': 0, 'signed_sq': 0, 'signed_summ': 0, 'work_ed': 0, 'work_sq': 0, 'work_summ': 0, 'activity':0, 'activity_significant': 0, 'activity_percent': 0};



            _.each(self.collection.models, function(item){
                if (item.get('interes_ed') > 0 || item.get('work_ed') || item.get('signed_ed')){
                    var ln =  managersTemplateItem;
                    self.$('.managerstable tbody').append(ln(item.toJSON()));

                    total.fail_ed += item.get('fail_ed');
                    total.fail_sq += item.get('fail_sq');
                    total.fail_summ += item.get('fail_summ');
                    total.interes_ed += item.get('interes_ed');
                    total.interes_sq += item.get('interes_sq');
                    total.interes_summ += item.get('interes_summ');
                    total.signed_ed += item.get('signed_ed');
                    total.signed_sq += item.get('signed_sq');
                    total.signed_summ += item.get('signed_summ');
                    total.work_ed += item.get('work_ed');
                    total.work_sq += item.get('work_sq');
                    total.work_summ += item.get('work_summ');
                    total.activity += item.get('activity');
                    total.activity_significant += item.get('activity_significant');
                    total.activity_percent += item.get('activity_percent');
                }
            });

            var tt = managersTotalTemplate;
            self.$('.managerstable tbody').append(tt(total));

            return this;
        },
        close:function(){
            //this.$el.hide();
            this.$el.empty();
            this.undelegateEvents();
            this.$el.removeData().unbind();
        }
    });


module.exports = ManagersView;