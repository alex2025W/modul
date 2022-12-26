var TaskFormItenView = require('./task_form_item_view'),
    TaskModel = require('../models/task_model'),
    Routine = require('../utils/routine.js'),
    taskTableTemplate = require('../templates/task_table_template.html');

var TaskFormView = Backbone.View.extend({
    events:{
        'click .save-task': 'saveTask',
        'click .save-task-confirm': 'saveTaskConfirm',
        'click .save-task-cancel': 'saveTaskCancel',
        'click .close-task': 'closeModal',
        'click .change-date': 'changeDate'
    },
    initialize:function(){
        var self = this;
        this.template = taskTableTemplate;
        if (this.model.get('id') != ''){
            this.model.fetch({timeout:50000}).complete(function(){
                self.render();
            });
        }
        else{
            self.render();
        }
        var fr = Backbone.history.fragment;
        window.app_router.navigate(fr+'/tasks/'+ this.model.get('id'));

        this.listenTo(this.model, 'change reset add remove', this.render);
    },
    render:function(){
        this.$el.html(this.template());
        var self = this;
        var hc = this.model.get('tasks');
        _.each(hc.models, function(item){
            self.renderOne(item);
        });
        this.$('.datepickr').datepicker({weekStart:1}).datepicker('setValue', new Date());
        this.$el.on('hidden', function () {
            self.$el.empty();
            self.undelegateEvents();
            self.$el.removeData().unbind();
            var fr = Backbone.history.fragment.toString();
            window.app_router.navigate(fr.replace('/tasks/'+ self.model.get('id'), ''));
        });
        return this;
    },

    renderOne:function(item){

        var view = new TaskFormItenView({'model':item, 'orderModel': this.model});
        this.$('tbody').append(view.render().el);
        return view;
    },
    changeDate: function(){

    },
    saveTaskOk:function(){
        var hm = new TaskModel();
        var self = this;
        var close_date = this.$('.datepickr input').val();

        hm.set({
            'condition': this.$('.task-select').val(),
            'comment': this.$('.task-comment-text').val(),
            'datetime':'new',
            'closedatetime': close_date
        });
        this.model.get('tasks').add(hm);
        this.model.save().done(function(){
            self.closeModal();
        }).error(function(){
            // в случае ошибки необходимо удалить новое не сохраненное состояние задачи
            // для этого смотрим все модели коллекции состояний
            show_server_error();
            var tc = self.model.get('tasks');
            _.each(tc.models, function(item){
                if(item==hm)
                    tc.remove(item);
            });
        });
    },
    saveHistoryCancel:function(){
        this.$('.alert').hide();
        this.$('.save-history').show();
        this.$('.close-history').show();
    },

     saveTaskCancel:function(){
        this.$('.confirm-task-panel').hide();
        this.$('.add-task-panel').show();
    },
    saveTaskConfirm:function(){
        var close_date = this.$('.datepickr input').val();
        var hm = new TaskModel();
        var self = this;
        var close_date = this.$('.datepickr input').val();
        hm.set({
            'condition': this.$('.task-select').val(),
            'comment': this.$('.task-comment-text').val(),
            'datetime':'new',
            'closedatetime': close_date
        });
        this.model.get('tasks').add(hm);
        this.model.set({'ignore_state_date':close_date});

        var hist = this.model.get('history');
        var last_state = hist.models[hist.length-1];
        var log = last_state.get('log');
        log.push(hm);
        this.model.save().done(function(){
            self.closeModal();
        }).error(function(){
            // в случае ошибки необходимо удалить новое не сохраненное состояние задачи
            // для этого смотрим все модели коллекции состояний
            var tc = self.model.get('tasks');
            _.each(tc.models, function(item){
                if(item==hm)
                    tc.remove(item);
            });
        });
    },
    saveTask:function(){
        if (this.$('.task-comment-text').val() == '')
        {
            alert('Необходимо указать примечание к задаче.');
            return;
        }

        var close_date = this.$('.datepickr input').val();
        var last_state_date = this.model.get('l_state_date');
        var sost_days = window.SOSTDAYS;
        if (moment(close_date, 'DD.MM.YYYY') > Routine.add_work_days(moment(last_state_date, ['DD.MM.YYYY','DD.MM.YYYY HH:mm:ss']), sost_days[this.model.get('condition')])){
            this.$('.add-task-panel').hide();
            this.$('.confirm-task-panel').show();
            return;
        }
         else{
            this.saveTaskOk();
        }
    },

    closeModal:function(){
        var self = this;
        this.$el.modal('hide');
        $("body").removeClass("modal-open");
    }
});

module.exports = TaskFormView;
