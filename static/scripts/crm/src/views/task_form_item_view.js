/**
* задача из списка
**/

var Routine = require('../utils/routine.js'),
    taskTableItemTemplate = require('../templates/task_table_item_template.html');

var TaskFormItenView = Backbone.View.extend({
        tagName:'tr',
        orderModel:null,
        events:{
            'click .ex-task': 'exTask',
            'click .comp-task': 'compTask',
        },
        initialize:function(){
            var self = this;
            this.template = taskTableItemTemplate;
            // this.listenTo(this.model, 'change reset add remove', this.render);
        },
        getNextTask:function(){
            var bigtask = null;
            var last_state_date = this.options.orderModel.get('l_state_date');
            var hist = this.options.orderModel.get('history');
            var last_state = hist.models[hist.length-1];
            var sost_days = window.SOSTDAYS;
            var self = this;
            _.each( this.options.orderModel.get('tasks').models, function(item){
                if (item.get('status') == ''){
                    var enddate = moment(item.get('closedatetime'), 'DD.MM.YYYY');
                    if (enddate > Routine.add_work_days(moment(self.options.orderModel.get('datetime'), ['DD.MM.YYYY','DD.MM.YYYY HH:mm:ss']), sost_days[self.options.orderModel.get('condition')])){
                        if (bigtask){
                            if (enddate > moment(bigtask.get('closedatetime'), 'DD.MM.YYYY')){
                                bigtask = item;
                            }
                        }
                        else{
                            bigtask = item;
                        }

                    }
                }
            });
            if (bigtask){
                this.options.orderModel.set({'ignore_state_date':bigtask.get('closedatetime')});
                last_state.get('log').push(bigtask);
            }
            else{
                this.options.orderModel.set({'ignore_state_date':'no'});
            }
        },
        exTask:function(){
            var self = this;
            this.model.set({'status': 'отменена'});
            this.getNextTask();
            this.options.orderModel.save().done(function(){
                self.$('.status-block').addClass('hide');
                self.$('.change-date').addClass('hide');
                self.$('.task-status').text('отменена');
            });
            return 0;
        },
        compTask:function(){
            var self = this;
            this.model.set({'status': 'завершена'});
            this.getNextTask();
            this.options.orderModel.save().done(function(){
                self.$('.status-block').addClass('hide');
                self.$('.change-date').addClass('hide');
                self.$('.task-status').text('завершена');
            });
            return 0;
        },
        render:function(){
            var self = this;
            this.$el.html(this.template(this.model.toJSON()));
            this.$('.change-date').datepicker({weekStart:1}).on('changeDate', function(ev){
                    var newdate = self.$('.change-date').data('date');
                    self.$('.change-date').datepicker('setValue', ev.date);
                    self.$('.change-date').datepicker('hide');
                    self.model.set({'closedatetime': newdate});
                    self.getNextTask();
                    self.options.orderModel.save();
                    self.render();
                });
            if (this.model.get('status') == ''){
                this.$('.status-block').removeClass('hide');
                this.$('.change-date').removeClass('hide');
            }
            this.$('.ex-task').show();
            if (MANAGER !=this.model.get("manager"))
                this.$('.ex-task').hide();
            return this;

        }
    });

module.exports = TaskFormItenView;
