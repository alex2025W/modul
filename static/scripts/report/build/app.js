(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var OutgoingView = require('./views/outgoing_view');
var OutgoingTableView = require('./views/outgoing_table_view');
var OutgoingCollection = require('./collections/outgoing_collection');
$(function() {
    var outgoing_collection = new OutgoingCollection();
    outgoing_collection.fetch().done(function(){
      var outgoing = new OutgoingView({collection: outgoing_collection});
      var outgoing_list = new OutgoingTableView({collection: outgoing_collection});
    })
});

},{"./collections/outgoing_collection":2,"./views/outgoing_table_view":7,"./views/outgoing_view":8}],2:[function(require,module,exports){
var OutgoingModel = require('../models/outgoing_model');

var OutgoingCollection = Backbone.Collection.extend({
    url: '/handlers/contracts/outgoinglist/',
    model: OutgoingModel
});

module.exports = OutgoingCollection;

},{"../models/outgoing_model":3}],3:[function(require,module,exports){
var OutgoingModel = Backbone.Model.extend({
    urlRoot:'/handlers/contracts/outgoing',
    defaults:{
        correspondent: '',
        //name: '',
        type: '',
        note: '',
        number: 0,
        date: '',
        user: ''
    }
});

module.exports = OutgoingModel;

},{}],4:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="row">\r\n<form class="form-horizontal span7">\r\n\r\n   <div class="control-group">\r\n    <label class="control-label" for="correspondent">Адресат</label>\r\n    <div class="controls">\r\n    <div id="correspondent-dropdown">\r\n    <input type="text" id="correspondent" autocomplete="off" placeholder="Адресат">\r\n    <div id="cor-exists" class="alert alert-warning hide">\r\n        Введённое название существует в БД. Установить связь?&nbsp;&nbsp;<a id="select-corr" class="btn" href="javascript:;">Выбрать</a>\r\n    </div>\r\n         <ul id="corr-dropdown-menu" class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu"></ul>\r\n     </div>\r\n    </div>\r\n  </div>\r\n\r\n  <div class="control-group">\r\n    <label class="control-label" for="outgoing-type">Тип</label>\r\n    <div class="controls">\r\n     <select id="outgoing-type">\r\n         <option value="">Выберите значение</option>\r\n          ';
 _(window.DICTS.outgoing_type).each(function(row) {
__p+='\r\n              <option value="'+
((__t=( row ))==null?'':__t)+
'">'+
((__t=( row ))==null?'':__t)+
'</option>\r\n          ';
 });
__p+='\r\n     </select>\r\n    </div>\r\n  </div>\r\n\r\n  <div class="control-group">\r\n    <label class="control-label" for="outgoing-note">Краткое содержание документа</label>\r\n    <div class="controls">\r\n      <textarea  id="outgoing-note" class="span5" cols="20" rows="5"></textarea>\r\n    </div>\r\n  </div>\r\n\r\n  <div class="control-group">\r\n    <div class="controls">\r\n      <button id="add-btn" type="submit" class="btn">Получить номер</button>\r\n    </div>\r\n  </div>\r\n</form>\r\n<div class="span5">\r\n    <div class="alert alert-success hide">\r\n    </div>\r\n</div>\r\n</div>\r\n';
}
return __p;
};

},{}],5:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<tr>\r\n    <td>'+
((__t=( number ))==null?'':__t)+
'</td>\r\n    <td>'+
((__t=( date ))==null?'':__t)+
'</td>\r\n    <td>'+
((__t=( correspondent ))==null?'':__t)+
'</td>\r\n    <td>'+
((__t=( type ))==null?'':__t)+
'</td>\r\n    <td>'+
((__t=( note ))==null?'':__t)+
'</td>\r\n    <td>'+
((__t=( window.MANAGERS[user] ))==null?'':__t)+
'</td>\r\n</tr>\r\n';
}
return __p;
};

},{}],6:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<table class="table-bordered table" >\r\n <thead>\r\n     <tr>\r\n         <th>№</th>\r\n         <th>Дата</th>\r\n         <th>Адресат</th>\r\n         <th>Тип</th>\r\n         <th>Краткое содержание</th>\r\n         <th>Пользователь</th>\r\n     </tr>\r\n </thead>\r\n  <tbody class="outgoing-table1">\r\n  </tbody>\r\n</table>\r\n';
}
return __p;
};

},{}],7:[function(require,module,exports){
var OutgoingTableTemplate = require('../templates/outgoing_table_template.html');
var OutgoingItemTemplate = require('../templates/outgoing_table_item_template.html');

var OutgoingTableView = Backbone.View.extend({
   el: $('#outgoing-table'),
   initialize: function(){
       this.template = OutgoingTableTemplate;
       this.listenTo(this.collection, 'change reset add remove', this.render);
       this.render();
   },
    render: function(){
        this.$el.html(this.template());
        var self = this;
        this.$("tbody").empty();
        this.collection.models.map(function(item){
            self.renderOne(item);
        });
        return this;
    },
    renderOne: function(item){
        var el = OutgoingItemTemplate(item.toJSON());
        this.$("tbody").prepend(el);
        return el;
    }
});

module.exports = OutgoingTableView;

},{"../templates/outgoing_table_item_template.html":5,"../templates/outgoing_table_template.html":6}],8:[function(require,module,exports){
var OutgoingModel = require('../models/outgoing_model');
var OutgoingFormTemplate = require('../templates/outgoing_form_template.html');

var OutgoingView = Backbone.View.extend({
    el: $('#outgoing-form'),
    corr_is_new:true,
    old_correspondent: "",
    find_list:[],
    events: {
        'click #add-btn': 'addNew',
        'click #select-corr': 'findExCorrespondent',
        'blur #correspondent': 'onBlur',
        'keydown #correspondent': 'onKeyPress',
        'keypress #correspondent': 'onKeyPress'

    },


    initialize: function () {
        this.template = OutgoingFormTemplate;
        this.render();
    },
    corrIsNew: function(is_new){
        this.corr_is_new = is_new;
    },

    corrAjax:function(corr_str, ok){
        $.get("/handlers/clientnamefind/?type=adresat&q=" + encodeURIComponent(Routine.trim(corr_str) ))
        .done(ok);
    },

    findExCorrespondent: function(){
       var $ddm = this.$('#corr-dropdown-menu');
        var self = this;
        var $corr = this.$('#correspondent');
        this.$('#cor-exists').hide();
        $ddm.empty();
        var dd_li = '';
        this.find_list.forEach(function(e){
            dd_li += '<li><a data-name="'+Routine.trim(e.name.replace(/\"/g,'&quot;'))+'" data-id="'+e.id+'" tabindex="-1" href="javascript:;">'+e.name+'<br><span class="small-grey">'+e.addr+'</span></a></li>';
            });
        $ddm.html(dd_li);
        if (this.find_list.length > 0)
            $ddm.show();

                $('a', $ddm).on('click', function(){
                    $corr.val($(this).data('name').replace('&quot;','"'));
                    $corr.data('id', $(this).data('id'));
                    $ddm.hide();
                });
    },

    findCorrespondent: function(){
        var $corr = this.$('#correspondent');
        var corr_str = $corr.val();
        var $ddm = this.$('#corr-dropdown-menu');
        $ddm.hide();
        var self = this;
        $corr.data('id', '');
        this.find_list = [];
        if (corr_str.length < 2) return;
        var done = function(ret){
            $ddm.empty();
                if (ret.result.length > 0){
                    this.corrIsNew(false);
                    var dd_li = '';
                    ret.result.forEach(function(e){
                        if (Routine.trim(e.name).toLowerCase() === Routine.trim(corr_str).toLowerCase()){
                            self.find_list.push(e);
                        }
                        dd_li += '<li><a data-name="'+Routine.trim(e.name).replace(/\"/g,'&quot;')+'" data-type="'+e.type+'" data-id="'+e.id+'" tabindex="-1" href="javascript:;">'+e.name+'<br><span class="small-grey">'+e.addr+'</span></a></li>';
                    });
                    $ddm.html(dd_li);
                    $ddm.show();
                $('a', $ddm).on('click', function(){
                    $corr.val($(this).data('name').toString().replace('&quot;','"'));
                    $corr.data('id', $(this).data('id'));
                    $corr.data("type",$(this).data("type"));
                    $ddm.hide();
                });
                }
                else{
                    this.corrIsNew(true);
                }

        }.bind(this);
        this.corrAjax(corr_str,done);
    },

    /**
     * Автовыбор корреспондента
    **/
    autoselectCorr: function(){
        var self = this;
        var name = this.$('#correspondent').val();
        if (name != '')
        {
            if(this.find_list.length > 0)
            {
                //this.$('#cor-exists').show();
                bootbox.confirm({
                        message: 'Введённое название существует в БД. Установить связь?',
                        buttons: {
                            'cancel': {
                                label: 'Нет',
                            },
                            'confirm': {
                                label: 'Да',
                            }
                        },
                        callback: function(result) {
                            if (result)
                            {
                                if(self.find_list.length === 1)
                                {
                                    self.$('#correspondent').data('id', self.find_list[0].id);
                                    return;
                                }
                                else
                                    self.findExCorrespondent();
                            }
                        }
                });
            }
        }
    },

    onKeyPress: function(e)
    {
        if(e.keyCode!=13){
            this.$('#correspondent').data('id','');
            this.corrIsNew(true);
            this.find_list = [];
        }
         //console.log("1");
    },

    /**
     * Потеря фокуса на поле ввода корреспондента
    **/
    onBlur: function(e)
    {
        var self = this;
        setTimeout( function()
        {
            var $corr = this.$('#correspondent');
            if($corr.val())
            {
                   var $ddm = this.$('#corr-dropdown-menu');
                   if ($ddm.is(':visible'))
                        $ddm.hide();

                 //if (this.corr_is_new && $corr.data('id') === '')
                 if (self.find_list.length<1  && $corr.data('id') === '')

                 {
                    bootbox.confirm({
                            message: 'Введено новое значение, которое не найдено в БД! Это может привести с захламлению БД и нарушению важных связей. <br/>Возможно, требуется изменить написание значения или его формулировку. <br/>Хотите попробовать другое написание, чтобы подобрать одно из уже существующих в БД значений?',
                            buttons: {
                                'cancel': {
                                    label: 'Нет',
                                },
                                'confirm': {
                                    label: 'Да',
                                }
                            },
                            callback: function(result) {
                                if (result)
                                {
                                    setTimeout(function(){
                                        this.$('#correspondent').focus();
                                    }.bind(self), 100);
                                }
                            }
                    });
                }
                else
                {
                    //setTimeout( function(){
                    var $corr = this.$('#correspondent');
                    var $corr_ex = this.$('#cor-exists');
                    //if (!this.corr_is_new && $corr.data('id') === ''){
                    if (self.find_list.length>0 && $corr.data('id') === ''){
                        this.autoselectCorr();
                    }
                        //}.bind(this),200);
                }
            }
         }.bind(this),200);
    },

    /**
     * Рендеринг
    **/
    render: function () {
        this.$el.html(this.template());
        var $corr = this.$('#correspondent');
        this.$('#corr-dropdown').dropdown();
        var debounced = _.debounce(this.findCorrespondent.bind(this), 300);
        $corr.on('keyup', debounced);
        $corr.on('focusin', function(){
            this.$('.alert-success').html('').hide();
            this.$('#cor-exists').hide();
        }.bind(this));
        return this;
    },

    /**
     * Добавление
    **/
    addNew: function (e) {
        e.preventDefault();
        this.$('#cor-exists').hide();
        var $corr = this.$('#correspondent');
        if (this.$('#outgoing-type').val() === ""){
            $.jGrowl('Выберите тип!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        var corr_name = Routine.trim($corr.val());
        if (corr_name === ""){
            $.jGrowl('Выберите корреспондента!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        if (this.$('#outgoing-note').val() === ""){
            $.jGrowl('Введите краткое содержание документа!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
            return;
        }
        var self = this;
        var md = new OutgoingModel();
        Routine.showLoader();
        md.set({
            correspondent: corr_name,
//            correspondent_id: $corr.data('id'),
            type: this.$('#outgoing-type').val(),
            note: this.$('#outgoing-note').val(),
            number: 0,
            date: ''
        });
        if($corr.data('type')=="contragent")
            md.set("contragent_id",$corr.data('id'));
        else
            md.set("correspondent_id",$corr.data('id'));

        md.save().done(function (ret) {
            self.collection.add(ret.data);
            self.$('#correspondent').val("").data('id','');
            self.$('#outgoing-name').val("");
            self.$('#outgoing-type').val("");
            self.$('#outgoing-note').val("");
            self.$('#correspondent').data('id','');
            self.corr_is_new = true;

            self.$('.alert-success').html('Исх. № '+ret.data.number+' от '+ ret.data.date)
                .show();
        }).always(function(){Routine.hideLoader();});
    }
});

module.exports = OutgoingView;

},{"../models/outgoing_model":3,"../templates/outgoing_form_template.html":4}]},{},[1])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzdGF0aWMvc2NyaXB0cy9yZXBvcnQvc3JjL2FwcC5qcyIsInN0YXRpYy9zY3JpcHRzL3JlcG9ydC9zcmMvY29sbGVjdGlvbnMvb3V0Z29pbmdfY29sbGVjdGlvbi5qcyIsInN0YXRpYy9zY3JpcHRzL3JlcG9ydC9zcmMvbW9kZWxzL291dGdvaW5nX21vZGVsLmpzIiwic3RhdGljL3NjcmlwdHMvcmVwb3J0L3NyYy90ZW1wbGF0ZXMvb3V0Z29pbmdfZm9ybV90ZW1wbGF0ZS5odG1sIiwic3RhdGljL3NjcmlwdHMvcmVwb3J0L3NyYy90ZW1wbGF0ZXMvb3V0Z29pbmdfdGFibGVfaXRlbV90ZW1wbGF0ZS5odG1sIiwic3RhdGljL3NjcmlwdHMvcmVwb3J0L3NyYy90ZW1wbGF0ZXMvb3V0Z29pbmdfdGFibGVfdGVtcGxhdGUuaHRtbCIsInN0YXRpYy9zY3JpcHRzL3JlcG9ydC9zcmMvdmlld3Mvb3V0Z29pbmdfdGFibGVfdmlldy5qcyIsInN0YXRpYy9zY3JpcHRzL3JlcG9ydC9zcmMvdmlld3Mvb3V0Z29pbmdfdmlldy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImFwcC5qcyIsInNvdXJjZVJvb3QiOiIvc291cmNlLyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIE91dGdvaW5nVmlldyA9IHJlcXVpcmUoJy4vdmlld3Mvb3V0Z29pbmdfdmlldycpO1xyXG52YXIgT3V0Z29pbmdUYWJsZVZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL291dGdvaW5nX3RhYmxlX3ZpZXcnKTtcclxudmFyIE91dGdvaW5nQ29sbGVjdGlvbiA9IHJlcXVpcmUoJy4vY29sbGVjdGlvbnMvb3V0Z29pbmdfY29sbGVjdGlvbicpO1xyXG4kKGZ1bmN0aW9uKCkge1xyXG4gICAgdmFyIG91dGdvaW5nX2NvbGxlY3Rpb24gPSBuZXcgT3V0Z29pbmdDb2xsZWN0aW9uKCk7XHJcbiAgICBvdXRnb2luZ19jb2xsZWN0aW9uLmZldGNoKCkuZG9uZShmdW5jdGlvbigpe1xyXG4gICAgICB2YXIgb3V0Z29pbmcgPSBuZXcgT3V0Z29pbmdWaWV3KHtjb2xsZWN0aW9uOiBvdXRnb2luZ19jb2xsZWN0aW9ufSk7XHJcbiAgICAgIHZhciBvdXRnb2luZ19saXN0ID0gbmV3IE91dGdvaW5nVGFibGVWaWV3KHtjb2xsZWN0aW9uOiBvdXRnb2luZ19jb2xsZWN0aW9ufSk7XHJcbiAgICB9KVxyXG59KTtcclxuIiwidmFyIE91dGdvaW5nTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvb3V0Z29pbmdfbW9kZWwnKTtcclxuXHJcbnZhciBPdXRnb2luZ0NvbGxlY3Rpb24gPSBCYWNrYm9uZS5Db2xsZWN0aW9uLmV4dGVuZCh7XHJcbiAgICB1cmw6ICcvaGFuZGxlcnMvY29udHJhY3RzL291dGdvaW5nbGlzdC8nLFxyXG4gICAgbW9kZWw6IE91dGdvaW5nTW9kZWxcclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE91dGdvaW5nQ29sbGVjdGlvbjtcclxuIiwidmFyIE91dGdvaW5nTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xyXG4gICAgdXJsUm9vdDonL2hhbmRsZXJzL2NvbnRyYWN0cy9vdXRnb2luZycsXHJcbiAgICBkZWZhdWx0czp7XHJcbiAgICAgICAgY29ycmVzcG9uZGVudDogJycsXHJcbiAgICAgICAgLy9uYW1lOiAnJyxcclxuICAgICAgICB0eXBlOiAnJyxcclxuICAgICAgICBub3RlOiAnJyxcclxuICAgICAgICBudW1iZXI6IDAsXHJcbiAgICAgICAgZGF0ZTogJycsXHJcbiAgICAgICAgdXNlcjogJydcclxuICAgIH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE91dGdvaW5nTW9kZWw7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKXtcbnZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xud2l0aChvYmp8fHt9KXtcbl9fcCs9JzxkaXYgY2xhc3M9XCJyb3dcIj5cXHJcXG48Zm9ybSBjbGFzcz1cImZvcm0taG9yaXpvbnRhbCBzcGFuN1wiPlxcclxcblxcclxcbiAgIDxkaXYgY2xhc3M9XCJjb250cm9sLWdyb3VwXCI+XFxyXFxuICAgIDxsYWJlbCBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBmb3I9XCJjb3JyZXNwb25kZW50XCI+0JDQtNGA0LXRgdCw0YI8L2xhYmVsPlxcclxcbiAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHNcIj5cXHJcXG4gICAgPGRpdiBpZD1cImNvcnJlc3BvbmRlbnQtZHJvcGRvd25cIj5cXHJcXG4gICAgPGlucHV0IHR5cGU9XCJ0ZXh0XCIgaWQ9XCJjb3JyZXNwb25kZW50XCIgYXV0b2NvbXBsZXRlPVwib2ZmXCIgcGxhY2Vob2xkZXI9XCLQkNC00YDQtdGB0LDRglwiPlxcclxcbiAgICA8ZGl2IGlkPVwiY29yLWV4aXN0c1wiIGNsYXNzPVwiYWxlcnQgYWxlcnQtd2FybmluZyBoaWRlXCI+XFxyXFxuICAgICAgICDQktCy0LXQtNGR0L3QvdC+0LUg0L3QsNC30LLQsNC90LjQtSDRgdGD0YnQtdGB0YLQstGD0LXRgiDQsiDQkdCULiDQo9GB0YLQsNC90L7QstC40YLRjCDRgdCy0Y/Qt9GMPyZuYnNwOyZuYnNwOzxhIGlkPVwic2VsZWN0LWNvcnJcIiBjbGFzcz1cImJ0blwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj7QktGL0LHRgNCw0YLRjDwvYT5cXHJcXG4gICAgPC9kaXY+XFxyXFxuICAgICAgICAgPHVsIGlkPVwiY29yci1kcm9wZG93bi1tZW51XCIgY2xhc3M9XCJkcm9wZG93bi1tZW51XCIgcm9sZT1cIm1lbnVcIiBhcmlhLWxhYmVsbGVkYnk9XCJkcm9wZG93bk1lbnVcIj48L3VsPlxcclxcbiAgICAgPC9kaXY+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuXFxyXFxuICA8ZGl2IGNsYXNzPVwiY29udHJvbC1ncm91cFwiPlxcclxcbiAgICA8bGFiZWwgY2xhc3M9XCJjb250cm9sLWxhYmVsXCIgZm9yPVwib3V0Z29pbmctdHlwZVwiPtCi0LjQvzwvbGFiZWw+XFxyXFxuICAgIDxkaXYgY2xhc3M9XCJjb250cm9sc1wiPlxcclxcbiAgICAgPHNlbGVjdCBpZD1cIm91dGdvaW5nLXR5cGVcIj5cXHJcXG4gICAgICAgICA8b3B0aW9uIHZhbHVlPVwiXCI+0JLRi9Cx0LXRgNC40YLQtSDQt9C90LDRh9C10L3QuNC1PC9vcHRpb24+XFxyXFxuICAgICAgICAgICc7XG4gXyh3aW5kb3cuRElDVFMub3V0Z29pbmdfdHlwZSkuZWFjaChmdW5jdGlvbihyb3cpIHsgXG5fX3ArPSdcXHJcXG4gICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCInK1xuKChfX3Q9KCByb3cgKSk9PW51bGw/Jyc6X190KStcbidcIj4nK1xuKChfX3Q9KCByb3cgKSk9PW51bGw/Jyc6X190KStcbic8L29wdGlvbj5cXHJcXG4gICAgICAgICAgJztcbiB9KTsgXG5fX3ArPSdcXHJcXG4gICAgIDwvc2VsZWN0PlxcclxcbiAgICA8L2Rpdj5cXHJcXG4gIDwvZGl2PlxcclxcblxcclxcbiAgPGRpdiBjbGFzcz1cImNvbnRyb2wtZ3JvdXBcIj5cXHJcXG4gICAgPGxhYmVsIGNsYXNzPVwiY29udHJvbC1sYWJlbFwiIGZvcj1cIm91dGdvaW5nLW5vdGVcIj7QmtGA0LDRgtC60L7QtSDRgdC+0LTQtdGA0LbQsNC90LjQtSDQtNC+0LrRg9C80LXQvdGC0LA8L2xhYmVsPlxcclxcbiAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHNcIj5cXHJcXG4gICAgICA8dGV4dGFyZWEgIGlkPVwib3V0Z29pbmctbm90ZVwiIGNsYXNzPVwic3BhbjVcIiBjb2xzPVwiMjBcIiByb3dzPVwiNVwiPjwvdGV4dGFyZWE+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuXFxyXFxuICA8ZGl2IGNsYXNzPVwiY29udHJvbC1ncm91cFwiPlxcclxcbiAgICA8ZGl2IGNsYXNzPVwiY29udHJvbHNcIj5cXHJcXG4gICAgICA8YnV0dG9uIGlkPVwiYWRkLWJ0blwiIHR5cGU9XCJzdWJtaXRcIiBjbGFzcz1cImJ0blwiPtCf0L7Qu9GD0YfQuNGC0Ywg0L3QvtC80LXRgDwvYnV0dG9uPlxcclxcbiAgICA8L2Rpdj5cXHJcXG4gIDwvZGl2PlxcclxcbjwvZm9ybT5cXHJcXG48ZGl2IGNsYXNzPVwic3BhbjVcIj5cXHJcXG4gICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LXN1Y2Nlc3MgaGlkZVwiPlxcclxcbiAgICA8L2Rpdj5cXHJcXG48L2Rpdj5cXHJcXG48L2Rpdj5cXHJcXG4nO1xufVxucmV0dXJuIF9fcDtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iail7XG52YXIgX190LF9fcD0nJyxfX2o9QXJyYXkucHJvdG90eXBlLmpvaW4scHJpbnQ9ZnVuY3Rpb24oKXtfX3ArPV9fai5jYWxsKGFyZ3VtZW50cywnJyk7fTtcbndpdGgob2JqfHx7fSl7XG5fX3ArPSc8dHI+XFxyXFxuICAgIDx0ZD4nK1xuKChfX3Q9KCBudW1iZXIgKSk9PW51bGw/Jyc6X190KStcbic8L3RkPlxcclxcbiAgICA8dGQ+JytcbigoX190PSggZGF0ZSApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICAgIDx0ZD4nK1xuKChfX3Q9KCBjb3JyZXNwb25kZW50ICkpPT1udWxsPycnOl9fdCkrXG4nPC90ZD5cXHJcXG4gICAgPHRkPicrXG4oKF9fdD0oIHR5cGUgKSk9PW51bGw/Jyc6X190KStcbic8L3RkPlxcclxcbiAgICA8dGQ+JytcbigoX190PSggbm90ZSApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICAgIDx0ZD4nK1xuKChfX3Q9KCB3aW5kb3cuTUFOQUdFUlNbdXNlcl0gKSk9PW51bGw/Jyc6X190KStcbic8L3RkPlxcclxcbjwvdHI+XFxyXFxuJztcbn1cbnJldHVybiBfX3A7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xudmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLHByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XG53aXRoKG9ianx8e30pe1xuX19wKz0nPHRhYmxlIGNsYXNzPVwidGFibGUtYm9yZGVyZWQgdGFibGVcIiA+XFxyXFxuIDx0aGVhZD5cXHJcXG4gICAgIDx0cj5cXHJcXG4gICAgICAgICA8dGg+4oSWPC90aD5cXHJcXG4gICAgICAgICA8dGg+0JTQsNGC0LA8L3RoPlxcclxcbiAgICAgICAgIDx0aD7QkNC00YDQtdGB0LDRgjwvdGg+XFxyXFxuICAgICAgICAgPHRoPtCi0LjQvzwvdGg+XFxyXFxuICAgICAgICAgPHRoPtCa0YDQsNGC0LrQvtC1INGB0L7QtNC10YDQttCw0L3QuNC1PC90aD5cXHJcXG4gICAgICAgICA8dGg+0J/QvtC70YzQt9C+0LLQsNGC0LXQu9GMPC90aD5cXHJcXG4gICAgIDwvdHI+XFxyXFxuIDwvdGhlYWQ+XFxyXFxuICA8dGJvZHkgY2xhc3M9XCJvdXRnb2luZy10YWJsZTFcIj5cXHJcXG4gIDwvdGJvZHk+XFxyXFxuPC90YWJsZT5cXHJcXG4nO1xufVxucmV0dXJuIF9fcDtcbn07XG4iLCJ2YXIgT3V0Z29pbmdUYWJsZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL291dGdvaW5nX3RhYmxlX3RlbXBsYXRlLmh0bWwnKTtcclxudmFyIE91dGdvaW5nSXRlbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL291dGdvaW5nX3RhYmxlX2l0ZW1fdGVtcGxhdGUuaHRtbCcpO1xyXG5cclxudmFyIE91dGdvaW5nVGFibGVWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG4gICBlbDogJCgnI291dGdvaW5nLXRhYmxlJyksXHJcbiAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICB0aGlzLnRlbXBsYXRlID0gT3V0Z29pbmdUYWJsZVRlbXBsYXRlO1xyXG4gICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjaGFuZ2UgcmVzZXQgYWRkIHJlbW92ZScsIHRoaXMucmVuZGVyKTtcclxuICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgIH0sXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKCkpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB0aGlzLiQoXCJ0Ym9keVwiKS5lbXB0eSgpO1xyXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uKGl0ZW0pe1xyXG4gICAgICAgICAgICBzZWxmLnJlbmRlck9uZShpdGVtKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByZW5kZXJPbmU6IGZ1bmN0aW9uKGl0ZW0pe1xyXG4gICAgICAgIHZhciBlbCA9IE91dGdvaW5nSXRlbVRlbXBsYXRlKGl0ZW0udG9KU09OKCkpO1xyXG4gICAgICAgIHRoaXMuJChcInRib2R5XCIpLnByZXBlbmQoZWwpO1xyXG4gICAgICAgIHJldHVybiBlbDtcclxuICAgIH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IE91dGdvaW5nVGFibGVWaWV3O1xyXG4iLCJ2YXIgT3V0Z29pbmdNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9vdXRnb2luZ19tb2RlbCcpO1xyXG52YXIgT3V0Z29pbmdGb3JtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvb3V0Z29pbmdfZm9ybV90ZW1wbGF0ZS5odG1sJyk7XHJcblxyXG52YXIgT3V0Z29pbmdWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG4gICAgZWw6ICQoJyNvdXRnb2luZy1mb3JtJyksXHJcbiAgICBjb3JyX2lzX25ldzp0cnVlLFxyXG4gICAgb2xkX2NvcnJlc3BvbmRlbnQ6IFwiXCIsXHJcbiAgICBmaW5kX2xpc3Q6W10sXHJcbiAgICBldmVudHM6IHtcclxuICAgICAgICAnY2xpY2sgI2FkZC1idG4nOiAnYWRkTmV3JyxcclxuICAgICAgICAnY2xpY2sgI3NlbGVjdC1jb3JyJzogJ2ZpbmRFeENvcnJlc3BvbmRlbnQnLFxyXG4gICAgICAgICdibHVyICNjb3JyZXNwb25kZW50JzogJ29uQmx1cicsXHJcbiAgICAgICAgJ2tleWRvd24gI2NvcnJlc3BvbmRlbnQnOiAnb25LZXlQcmVzcycsXHJcbiAgICAgICAgJ2tleXByZXNzICNjb3JyZXNwb25kZW50JzogJ29uS2V5UHJlc3MnXHJcblxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSBPdXRnb2luZ0Zvcm1UZW1wbGF0ZTtcclxuICAgICAgICB0aGlzLnJlbmRlcigpO1xyXG4gICAgfSxcclxuICAgIGNvcnJJc05ldzogZnVuY3Rpb24oaXNfbmV3KXtcclxuICAgICAgICB0aGlzLmNvcnJfaXNfbmV3ID0gaXNfbmV3O1xyXG4gICAgfSxcclxuXHJcbiAgICBjb3JyQWpheDpmdW5jdGlvbihjb3JyX3N0ciwgb2spe1xyXG4gICAgICAgICQuZ2V0KFwiL2hhbmRsZXJzL2NsaWVudG5hbWVmaW5kLz90eXBlPWFkcmVzYXQmcT1cIiArIGVuY29kZVVSSUNvbXBvbmVudChSb3V0aW5lLnRyaW0oY29ycl9zdHIpICkpXHJcbiAgICAgICAgLmRvbmUob2spO1xyXG4gICAgfSxcclxuXHJcbiAgICBmaW5kRXhDb3JyZXNwb25kZW50OiBmdW5jdGlvbigpe1xyXG4gICAgICAgdmFyICRkZG0gPSB0aGlzLiQoJyNjb3JyLWRyb3Bkb3duLW1lbnUnKTtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyICRjb3JyID0gdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpO1xyXG4gICAgICAgIHRoaXMuJCgnI2Nvci1leGlzdHMnKS5oaWRlKCk7XHJcbiAgICAgICAgJGRkbS5lbXB0eSgpO1xyXG4gICAgICAgIHZhciBkZF9saSA9ICcnO1xyXG4gICAgICAgIHRoaXMuZmluZF9saXN0LmZvckVhY2goZnVuY3Rpb24oZSl7XHJcbiAgICAgICAgICAgIGRkX2xpICs9ICc8bGk+PGEgZGF0YS1uYW1lPVwiJytSb3V0aW5lLnRyaW0oZS5uYW1lLnJlcGxhY2UoL1xcXCIvZywnJnF1b3Q7JykpKydcIiBkYXRhLWlkPVwiJytlLmlkKydcIiB0YWJpbmRleD1cIi0xXCIgaHJlZj1cImphdmFzY3JpcHQ6O1wiPicrZS5uYW1lKyc8YnI+PHNwYW4gY2xhc3M9XCJzbWFsbC1ncmV5XCI+JytlLmFkZHIrJzwvc3Bhbj48L2E+PC9saT4nO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAkZGRtLmh0bWwoZGRfbGkpO1xyXG4gICAgICAgIGlmICh0aGlzLmZpbmRfbGlzdC5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICAkZGRtLnNob3coKTtcclxuXHJcbiAgICAgICAgICAgICAgICAkKCdhJywgJGRkbSkub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAkY29yci52YWwoJCh0aGlzKS5kYXRhKCduYW1lJykucmVwbGFjZSgnJnF1b3Q7JywnXCInKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGNvcnIuZGF0YSgnaWQnLCAkKHRoaXMpLmRhdGEoJ2lkJykpO1xyXG4gICAgICAgICAgICAgICAgICAgICRkZG0uaGlkZSgpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICB9LFxyXG5cclxuICAgIGZpbmRDb3JyZXNwb25kZW50OiBmdW5jdGlvbigpe1xyXG4gICAgICAgIHZhciAkY29yciA9IHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKTtcclxuICAgICAgICB2YXIgY29ycl9zdHIgPSAkY29yci52YWwoKTtcclxuICAgICAgICB2YXIgJGRkbSA9IHRoaXMuJCgnI2NvcnItZHJvcGRvd24tbWVudScpO1xyXG4gICAgICAgICRkZG0uaGlkZSgpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICAkY29yci5kYXRhKCdpZCcsICcnKTtcclxuICAgICAgICB0aGlzLmZpbmRfbGlzdCA9IFtdO1xyXG4gICAgICAgIGlmIChjb3JyX3N0ci5sZW5ndGggPCAyKSByZXR1cm47XHJcbiAgICAgICAgdmFyIGRvbmUgPSBmdW5jdGlvbihyZXQpe1xyXG4gICAgICAgICAgICAkZGRtLmVtcHR5KCk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmV0LnJlc3VsdC5sZW5ndGggPiAwKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvcnJJc05ldyhmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGRkX2xpID0gJyc7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0LnJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoUm91dGluZS50cmltKGUubmFtZSkudG9Mb3dlckNhc2UoKSA9PT0gUm91dGluZS50cmltKGNvcnJfc3RyKS50b0xvd2VyQ2FzZSgpKXtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZmluZF9saXN0LnB1c2goZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGRfbGkgKz0gJzxsaT48YSBkYXRhLW5hbWU9XCInK1JvdXRpbmUudHJpbShlLm5hbWUpLnJlcGxhY2UoL1xcXCIvZywnJnF1b3Q7JykrJ1wiIGRhdGEtdHlwZT1cIicrZS50eXBlKydcIiBkYXRhLWlkPVwiJytlLmlkKydcIiB0YWJpbmRleD1cIi0xXCIgaHJlZj1cImphdmFzY3JpcHQ6O1wiPicrZS5uYW1lKyc8YnI+PHNwYW4gY2xhc3M9XCJzbWFsbC1ncmV5XCI+JytlLmFkZHIrJzwvc3Bhbj48L2E+PC9saT4nO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICRkZG0uaHRtbChkZF9saSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGRkbS5zaG93KCk7XHJcbiAgICAgICAgICAgICAgICAkKCdhJywgJGRkbSkub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICAkY29yci52YWwoJCh0aGlzKS5kYXRhKCduYW1lJykudG9TdHJpbmcoKS5yZXBsYWNlKCcmcXVvdDsnLCdcIicpKTtcclxuICAgICAgICAgICAgICAgICAgICAkY29yci5kYXRhKCdpZCcsICQodGhpcykuZGF0YSgnaWQnKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGNvcnIuZGF0YShcInR5cGVcIiwkKHRoaXMpLmRhdGEoXCJ0eXBlXCIpKTtcclxuICAgICAgICAgICAgICAgICAgICAkZGRtLmhpZGUoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvcnJJc05ldyh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfS5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHRoaXMuY29yckFqYXgoY29ycl9zdHIsZG9uZSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog0JDQstGC0L7QstGL0LHQvtGAINC60L7RgNGA0LXRgdC/0L7QvdC00LXQvdGC0LBcclxuICAgICoqL1xyXG4gICAgYXV0b3NlbGVjdENvcnI6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBuYW1lID0gdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpLnZhbCgpO1xyXG4gICAgICAgIGlmIChuYW1lICE9ICcnKVxyXG4gICAgICAgIHtcclxuICAgICAgICAgICAgaWYodGhpcy5maW5kX2xpc3QubGVuZ3RoID4gMClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgLy90aGlzLiQoJyNjb3ItZXhpc3RzJykuc2hvdygpO1xyXG4gICAgICAgICAgICAgICAgYm9vdGJveC5jb25maXJtKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ9CS0LLQtdC00ZHQvdC90L7QtSDQvdCw0LfQstCw0L3QuNC1INGB0YPRidC10YHRgtCy0YPQtdGCINCyINCR0JQuINCj0YHRgtCw0L3QvtCy0LjRgtGMINGB0LLRj9C30Yw/JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnV0dG9uczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NhbmNlbCc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsYWJlbDogJ9Cd0LXRgicsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbmZpcm0nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICfQlNCwJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2s6IGZ1bmN0aW9uKHJlc3VsdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3VsdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZihzZWxmLmZpbmRfbGlzdC5sZW5ndGggPT09IDEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLiQoJyNjb3JyZXNwb25kZW50JykuZGF0YSgnaWQnLCBzZWxmLmZpbmRfbGlzdFswXS5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZWxmLmZpbmRFeENvcnJlc3BvbmRlbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIG9uS2V5UHJlc3M6IGZ1bmN0aW9uKGUpXHJcbiAgICB7XHJcbiAgICAgICAgaWYoZS5rZXlDb2RlIT0xMyl7XHJcbiAgICAgICAgICAgIHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKS5kYXRhKCdpZCcsJycpO1xyXG4gICAgICAgICAgICB0aGlzLmNvcnJJc05ldyh0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5maW5kX2xpc3QgPSBbXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgIC8vY29uc29sZS5sb2coXCIxXCIpO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqINCf0L7RgtC10YDRjyDRhNC+0LrRg9GB0LAg0L3QsCDQv9C+0LvQtSDQstCy0L7QtNCwINC60L7RgNGA0LXRgdC/0L7QvdC00LXQvdGC0LBcclxuICAgICoqL1xyXG4gICAgb25CbHVyOiBmdW5jdGlvbihlKVxyXG4gICAge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgICB2YXIgJGNvcnIgPSB0aGlzLiQoJyNjb3JyZXNwb25kZW50Jyk7XHJcbiAgICAgICAgICAgIGlmKCRjb3JyLnZhbCgpKVxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICB2YXIgJGRkbSA9IHRoaXMuJCgnI2NvcnItZHJvcGRvd24tbWVudScpO1xyXG4gICAgICAgICAgICAgICAgICAgaWYgKCRkZG0uaXMoJzp2aXNpYmxlJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICRkZG0uaGlkZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAvL2lmICh0aGlzLmNvcnJfaXNfbmV3ICYmICRjb3JyLmRhdGEoJ2lkJykgPT09ICcnKVxyXG4gICAgICAgICAgICAgICAgIGlmIChzZWxmLmZpbmRfbGlzdC5sZW5ndGg8MSAgJiYgJGNvcnIuZGF0YSgnaWQnKSA9PT0gJycpXHJcblxyXG4gICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBib290Ym94LmNvbmZpcm0oe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogJ9CS0LLQtdC00LXQvdC+INC90L7QstC+0LUg0LfQvdCw0YfQtdC90LjQtSwg0LrQvtGC0L7RgNC+0LUg0L3QtSDQvdCw0LnQtNC10L3QviDQsiDQkdCUISDQrdGC0L4g0LzQvtC20LXRgiDQv9GA0LjQstC10YHRgtC4INGBINC30LDRhdC70LDQvNC70LXQvdC40Y4g0JHQlCDQuCDQvdCw0YDRg9GI0LXQvdC40Y4g0LLQsNC20L3Ri9GFINGB0LLRj9C30LXQuS4gPGJyLz7QktC+0LfQvNC+0LbQvdC+LCDRgtGA0LXQsdGD0LXRgtGB0Y8g0LjQt9C80LXQvdC40YLRjCDQvdCw0L/QuNGB0LDQvdC40LUg0LfQvdCw0YfQtdC90LjRjyDQuNC70Lgg0LXQs9C+INGE0L7RgNC80YPQu9C40YDQvtCy0LrRgy4gPGJyLz7QpdC+0YLQuNGC0LUg0L/QvtC/0YDQvtCx0L7QstCw0YLRjCDQtNGA0YPQs9C+0LUg0L3QsNC/0LjRgdCw0L3QuNC1LCDRh9GC0L7QsdGLINC/0L7QtNC+0LHRgNCw0YLRjCDQvtC00L3QviDQuNC3INGD0LbQtSDRgdGD0YnQtdGB0YLQstGD0Y7RidC40YUg0LIg0JHQlCDQt9C90LDRh9C10L3QuNC5PycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidXR0b25zOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NhbmNlbCc6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFiZWw6ICfQndC10YInLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2NvbmZpcm0nOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhYmVsOiAn0JTQsCcsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzdWx0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpLmZvY3VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0uYmluZChzZWxmKSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9zZXRUaW1lb3V0KCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciAkY29yciA9IHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgJGNvcnJfZXggPSB0aGlzLiQoJyNjb3ItZXhpc3RzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9pZiAoIXRoaXMuY29ycl9pc19uZXcgJiYgJGNvcnIuZGF0YSgnaWQnKSA9PT0gJycpe1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzZWxmLmZpbmRfbGlzdC5sZW5ndGg+MCAmJiAkY29yci5kYXRhKCdpZCcpID09PSAnJyl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXV0b3NlbGVjdENvcnIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vfS5iaW5kKHRoaXMpLDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgfS5iaW5kKHRoaXMpLDIwMCk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog0KDQtdC90LTQtdGA0LjQvdCzXHJcbiAgICAqKi9cclxuICAgIHJlbmRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSgpKTtcclxuICAgICAgICB2YXIgJGNvcnIgPSB0aGlzLiQoJyNjb3JyZXNwb25kZW50Jyk7XHJcbiAgICAgICAgdGhpcy4kKCcjY29yci1kcm9wZG93bicpLmRyb3Bkb3duKCk7XHJcbiAgICAgICAgdmFyIGRlYm91bmNlZCA9IF8uZGVib3VuY2UodGhpcy5maW5kQ29ycmVzcG9uZGVudC5iaW5kKHRoaXMpLCAzMDApO1xyXG4gICAgICAgICRjb3JyLm9uKCdrZXl1cCcsIGRlYm91bmNlZCk7XHJcbiAgICAgICAgJGNvcnIub24oJ2ZvY3VzaW4nLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICB0aGlzLiQoJy5hbGVydC1zdWNjZXNzJykuaHRtbCgnJykuaGlkZSgpO1xyXG4gICAgICAgICAgICB0aGlzLiQoJyNjb3ItZXhpc3RzJykuaGlkZSgpO1xyXG4gICAgICAgIH0uYmluZCh0aGlzKSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICog0JTQvtCx0LDQstC70LXQvdC40LVcclxuICAgICoqL1xyXG4gICAgYWRkTmV3OiBmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICB0aGlzLiQoJyNjb3ItZXhpc3RzJykuaGlkZSgpO1xyXG4gICAgICAgIHZhciAkY29yciA9IHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKTtcclxuICAgICAgICBpZiAodGhpcy4kKCcjb3V0Z29pbmctdHlwZScpLnZhbCgpID09PSBcIlwiKXtcclxuICAgICAgICAgICAgJC5qR3Jvd2woJ9CS0YvQsdC10YDQuNGC0LUg0YLQuNC/IScsIHsgJ3RoZW1lU3RhdGUnOidncm93bC1lcnJvcicsICdzdGlja3knOmZhbHNlLCBsaWZlOiA1MDAwIH0pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjb3JyX25hbWUgPSBSb3V0aW5lLnRyaW0oJGNvcnIudmFsKCkpO1xyXG4gICAgICAgIGlmIChjb3JyX25hbWUgPT09IFwiXCIpe1xyXG4gICAgICAgICAgICAkLmpHcm93bCgn0JLRi9Cx0LXRgNC40YLQtSDQutC+0YDRgNC10YHQv9C+0L3QtNC10L3RgtCwIScsIHsgJ3RoZW1lU3RhdGUnOidncm93bC1lcnJvcicsICdzdGlja3knOmZhbHNlLCBsaWZlOiA1MDAwIH0pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLiQoJyNvdXRnb2luZy1ub3RlJykudmFsKCkgPT09IFwiXCIpe1xyXG4gICAgICAgICAgICAkLmpHcm93bCgn0JLQstC10LTQuNGC0LUg0LrRgNCw0YLQutC+0LUg0YHQvtC00LXRgNC20LDQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwIScsIHsgJ3RoZW1lU3RhdGUnOidncm93bC1lcnJvcicsICdzdGlja3knOmZhbHNlLCBsaWZlOiA1MDAwIH0pO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgbWQgPSBuZXcgT3V0Z29pbmdNb2RlbCgpO1xyXG4gICAgICAgIFJvdXRpbmUuc2hvd0xvYWRlcigpO1xyXG4gICAgICAgIG1kLnNldCh7XHJcbiAgICAgICAgICAgIGNvcnJlc3BvbmRlbnQ6IGNvcnJfbmFtZSxcclxuLy8gICAgICAgICAgICBjb3JyZXNwb25kZW50X2lkOiAkY29yci5kYXRhKCdpZCcpLFxyXG4gICAgICAgICAgICB0eXBlOiB0aGlzLiQoJyNvdXRnb2luZy10eXBlJykudmFsKCksXHJcbiAgICAgICAgICAgIG5vdGU6IHRoaXMuJCgnI291dGdvaW5nLW5vdGUnKS52YWwoKSxcclxuICAgICAgICAgICAgbnVtYmVyOiAwLFxyXG4gICAgICAgICAgICBkYXRlOiAnJ1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGlmKCRjb3JyLmRhdGEoJ3R5cGUnKT09XCJjb250cmFnZW50XCIpXHJcbiAgICAgICAgICAgIG1kLnNldChcImNvbnRyYWdlbnRfaWRcIiwkY29yci5kYXRhKCdpZCcpKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIG1kLnNldChcImNvcnJlc3BvbmRlbnRfaWRcIiwkY29yci5kYXRhKCdpZCcpKTtcclxuXHJcbiAgICAgICAgbWQuc2F2ZSgpLmRvbmUoZnVuY3Rpb24gKHJldCkge1xyXG4gICAgICAgICAgICBzZWxmLmNvbGxlY3Rpb24uYWRkKHJldC5kYXRhKTtcclxuICAgICAgICAgICAgc2VsZi4kKCcjY29ycmVzcG9uZGVudCcpLnZhbChcIlwiKS5kYXRhKCdpZCcsJycpO1xyXG4gICAgICAgICAgICBzZWxmLiQoJyNvdXRnb2luZy1uYW1lJykudmFsKFwiXCIpO1xyXG4gICAgICAgICAgICBzZWxmLiQoJyNvdXRnb2luZy10eXBlJykudmFsKFwiXCIpO1xyXG4gICAgICAgICAgICBzZWxmLiQoJyNvdXRnb2luZy1ub3RlJykudmFsKFwiXCIpO1xyXG4gICAgICAgICAgICBzZWxmLiQoJyNjb3JyZXNwb25kZW50JykuZGF0YSgnaWQnLCcnKTtcclxuICAgICAgICAgICAgc2VsZi5jb3JyX2lzX25ldyA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICBzZWxmLiQoJy5hbGVydC1zdWNjZXNzJykuaHRtbCgn0JjRgdGFLiDihJYgJytyZXQuZGF0YS5udW1iZXIrJyDQvtGCICcrIHJldC5kYXRhLmRhdGUpXHJcbiAgICAgICAgICAgICAgICAuc2hvdygpO1xyXG4gICAgICAgIH0pLmFsd2F5cyhmdW5jdGlvbigpe1JvdXRpbmUuaGlkZUxvYWRlcigpO30pO1xyXG4gICAgfVxyXG59KTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gT3V0Z29pbmdWaWV3O1xyXG4iXX0=
