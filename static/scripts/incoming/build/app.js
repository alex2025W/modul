(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var IncomingView = require('./views/incoming_view');
var IncomingTableView = require('./views/incoming_table_view');
var IncomingCollection = require('./collections/incoming_collection');
$(function() {
  var incoming_collection = new IncomingCollection();
  incoming_collection.fetch().done(function(){
    var incoming = new IncomingView({collection: incoming_collection});
    var incoming_list = new IncomingTableView({collection: incoming_collection});
  })
});

},{"./collections/incoming_collection":2,"./views/incoming_table_view":7,"./views/incoming_view":8}],2:[function(require,module,exports){
var IncomingModel = require('../models/incoming_model');
var IncomingCollection = Backbone.Collection.extend({
  url: '/handlers/contracts/incominglist/',
  model: IncomingModel
});
module.exports = IncomingCollection;

},{"../models/incoming_model":3}],3:[function(require,module,exports){
var IncomingModel = Backbone.Model.extend({
  urlRoot:'/handlers/contracts/incoming',
  defaults:{
    correspondent: '',
    type: '',
    note: '',
    number: 0,
    date: '',
    user: ''
  }
});
module.exports = IncomingModel;

},{}],4:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<div class="row">\r\n  <form class="form-horizontal span7">\r\n     <div class="control-group">\r\n      <label class="control-label" for="correspondent">От кого</label>\r\n      <div class="controls">\r\n      <div id="correspondent-dropdown">\r\n      <input type="text" id="correspondent" autocomplete="off" placeholder="От кого">\r\n      <div id="cor-exists" class="alert alert-warning hide">\r\n        Введённое название существует в БД. Установить связь?&nbsp;&nbsp;<a id="select-corr" class="btn" href="javascript:;">Выбрать</a>\r\n      </div>\r\n        <ul id="corr-dropdown-menu" class="dropdown-menu" role="menu" aria-labelledby="dropdownMenu"></ul>\r\n      </div>\r\n      </div>\r\n    </div>\r\n    <div class="control-group">\r\n      <label class="control-label" for="incoming-type">Тип</label>\r\n      <div class="controls">\r\n       <select id="incoming-type">\r\n           <option value="">Выберите значение</option>\r\n            ';
 _(window.DICTS.incoming_type).each(function(row) {
__p+='\r\n                <option value="'+
((__t=( row ))==null?'':__t)+
'">'+
((__t=( row ))==null?'':__t)+
'</option>\r\n            ';
 });
__p+='\r\n       </select>\r\n      </div>\r\n    </div>\r\n    <div class="control-group">\r\n      <label class="control-label" for="incoming-note">Краткое содержание документа</label>\r\n      <div class="controls">\r\n        <textarea  id="incoming-note" class="span5" cols="20" rows="5"></textarea>\r\n      </div>\r\n    </div>\r\n    <div class="control-group">\r\n      <div class="controls">\r\n        <button id="add-btn" type="submit" class="btn">Получить номер</button>\r\n      </div>\r\n    </div>\r\n  </form>\r\n  <div class="span5">\r\n    <div class="alert alert-success hide"></div>\r\n  </div>\r\n</div>\r\n';
}
return __p;
};

},{}],5:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<tr>\r\n  <td>'+
((__t=( number ))==null?'':__t)+
'</td>\r\n  <td>'+
((__t=( date ))==null?'':__t)+
'</td>\r\n  <td>'+
((__t=( correspondent ))==null?'':__t)+
'</td>\r\n  <td>'+
((__t=( type ))==null?'':__t)+
'</td>\r\n  <td>'+
((__t=( note ))==null?'':__t)+
'</td>\r\n  <td>'+
((__t=( window.MANAGERS[user] ))==null?'':__t)+
'</td>\r\n</tr>\r\n';
}
return __p;
};

},{}],6:[function(require,module,exports){
module.exports = function(obj){
var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<table class="table-bordered table">\r\n  <thead>\r\n    <tr>\r\n     <th>№</th>\r\n     <th>Дата</th>\r\n     <th>От кого</th>\r\n     <th>Тип</th>\r\n     <th>Краткое содержание</th>\r\n     <th>Пользователь</th>\r\n    </tr>\r\n  </thead>\r\n  <tbody class="incoming-table1"></tbody>\r\n</table>\r\n';
}
return __p;
};

},{}],7:[function(require,module,exports){
var IncomingTableTemplate = require('../templates/incoming_table_template.html');
var IncomingItemTemplate = require('../templates/incoming_table_item_template.html');

var IncomingTableView = Backbone.View.extend({
   el: $('#incoming-table'),
   initialize: function(){
       this.template = IncomingTableTemplate;
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
        var el = IncomingItemTemplate(item.toJSON());
        this.$("tbody").prepend(el);
        return el;
    }
});

module.exports = IncomingTableView;

},{"../templates/incoming_table_item_template.html":5,"../templates/incoming_table_template.html":6}],8:[function(require,module,exports){
var IncomingModel = require('../models/incoming_model');
var IncomingFormTemplate = require('../templates/incoming_form_template.html');

var IncomingView = Backbone.View.extend({
  el: $('#incoming-form'),
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
    this.template = IncomingFormTemplate;
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
    if (this.$('#incoming-type').val() === ""){
      $.jGrowl('Выберите тип!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
      return;
    }
    var corr_name = Routine.trim($corr.val());
    if (corr_name === ""){
      $.jGrowl('Выберите корреспондента!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
      return;
    }
    if (this.$('#incoming-note').val() === ""){
      $.jGrowl('Введите краткое содержание документа!', { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
      return;
    }
    var self = this;
    var md = new IncomingModel();
    Routine.showLoader();
    md.set({
      correspondent: corr_name,
      type: this.$('#incoming-type').val(),
      note: this.$('#incoming-note').val(),
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
      self.$('#incoming-name').val("");
      self.$('#incoming-type').val("");
      self.$('#incoming-note').val("");
      self.$('#correspondent').data('id','');
      self.corr_is_new = true;
      self.$('.alert-success').html('Исх. № '+ret.data.number+' от '+ ret.data.date)
        .show();
    }).always(function(){Routine.hideLoader();});
  }
});
module.exports = IncomingView;

},{"../models/incoming_model":3,"../templates/incoming_form_template.html":4}]},{},[1])


//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzdGF0aWMvc2NyaXB0cy9pbmNvbWluZy9zcmMvYXBwLmpzIiwic3RhdGljL3NjcmlwdHMvaW5jb21pbmcvc3JjL2NvbGxlY3Rpb25zL2luY29taW5nX2NvbGxlY3Rpb24uanMiLCJzdGF0aWMvc2NyaXB0cy9pbmNvbWluZy9zcmMvbW9kZWxzL2luY29taW5nX21vZGVsLmpzIiwic3RhdGljL3NjcmlwdHMvaW5jb21pbmcvc3JjL3RlbXBsYXRlcy9pbmNvbWluZ19mb3JtX3RlbXBsYXRlLmh0bWwiLCJzdGF0aWMvc2NyaXB0cy9pbmNvbWluZy9zcmMvdGVtcGxhdGVzL2luY29taW5nX3RhYmxlX2l0ZW1fdGVtcGxhdGUuaHRtbCIsInN0YXRpYy9zY3JpcHRzL2luY29taW5nL3NyYy90ZW1wbGF0ZXMvaW5jb21pbmdfdGFibGVfdGVtcGxhdGUuaHRtbCIsInN0YXRpYy9zY3JpcHRzL2luY29taW5nL3NyYy92aWV3cy9pbmNvbWluZ190YWJsZV92aWV3LmpzIiwic3RhdGljL3NjcmlwdHMvaW5jb21pbmcvc3JjL3ZpZXdzL2luY29taW5nX3ZpZXcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJhcHAuanMiLCJzb3VyY2VSb290IjoiL3NvdXJjZS8iLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBJbmNvbWluZ1ZpZXcgPSByZXF1aXJlKCcuL3ZpZXdzL2luY29taW5nX3ZpZXcnKTtcclxudmFyIEluY29taW5nVGFibGVWaWV3ID0gcmVxdWlyZSgnLi92aWV3cy9pbmNvbWluZ190YWJsZV92aWV3Jyk7XHJcbnZhciBJbmNvbWluZ0NvbGxlY3Rpb24gPSByZXF1aXJlKCcuL2NvbGxlY3Rpb25zL2luY29taW5nX2NvbGxlY3Rpb24nKTtcclxuJChmdW5jdGlvbigpIHtcclxuICB2YXIgaW5jb21pbmdfY29sbGVjdGlvbiA9IG5ldyBJbmNvbWluZ0NvbGxlY3Rpb24oKTtcclxuICBpbmNvbWluZ19jb2xsZWN0aW9uLmZldGNoKCkuZG9uZShmdW5jdGlvbigpe1xyXG4gICAgdmFyIGluY29taW5nID0gbmV3IEluY29taW5nVmlldyh7Y29sbGVjdGlvbjogaW5jb21pbmdfY29sbGVjdGlvbn0pO1xyXG4gICAgdmFyIGluY29taW5nX2xpc3QgPSBuZXcgSW5jb21pbmdUYWJsZVZpZXcoe2NvbGxlY3Rpb246IGluY29taW5nX2NvbGxlY3Rpb259KTtcclxuICB9KVxyXG59KTtcclxuIiwidmFyIEluY29taW5nTW9kZWwgPSByZXF1aXJlKCcuLi9tb2RlbHMvaW5jb21pbmdfbW9kZWwnKTtcclxudmFyIEluY29taW5nQ29sbGVjdGlvbiA9IEJhY2tib25lLkNvbGxlY3Rpb24uZXh0ZW5kKHtcclxuICB1cmw6ICcvaGFuZGxlcnMvY29udHJhY3RzL2luY29taW5nbGlzdC8nLFxyXG4gIG1vZGVsOiBJbmNvbWluZ01vZGVsXHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEluY29taW5nQ29sbGVjdGlvbjtcclxuIiwidmFyIEluY29taW5nTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xyXG4gIHVybFJvb3Q6Jy9oYW5kbGVycy9jb250cmFjdHMvaW5jb21pbmcnLFxyXG4gIGRlZmF1bHRzOntcclxuICAgIGNvcnJlc3BvbmRlbnQ6ICcnLFxyXG4gICAgdHlwZTogJycsXHJcbiAgICBub3RlOiAnJyxcclxuICAgIG51bWJlcjogMCxcclxuICAgIGRhdGU6ICcnLFxyXG4gICAgdXNlcjogJydcclxuICB9XHJcbn0pO1xyXG5tb2R1bGUuZXhwb3J0cyA9IEluY29taW5nTW9kZWw7XHJcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKXtcbnZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xud2l0aChvYmp8fHt9KXtcbl9fcCs9JzxkaXYgY2xhc3M9XCJyb3dcIj5cXHJcXG4gIDxmb3JtIGNsYXNzPVwiZm9ybS1ob3Jpem9udGFsIHNwYW43XCI+XFxyXFxuICAgICA8ZGl2IGNsYXNzPVwiY29udHJvbC1ncm91cFwiPlxcclxcbiAgICAgIDxsYWJlbCBjbGFzcz1cImNvbnRyb2wtbGFiZWxcIiBmb3I9XCJjb3JyZXNwb25kZW50XCI+0J7RgiDQutC+0LPQvjwvbGFiZWw+XFxyXFxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xzXCI+XFxyXFxuICAgICAgPGRpdiBpZD1cImNvcnJlc3BvbmRlbnQtZHJvcGRvd25cIj5cXHJcXG4gICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiBpZD1cImNvcnJlc3BvbmRlbnRcIiBhdXRvY29tcGxldGU9XCJvZmZcIiBwbGFjZWhvbGRlcj1cItCe0YIg0LrQvtCz0L5cIj5cXHJcXG4gICAgICA8ZGl2IGlkPVwiY29yLWV4aXN0c1wiIGNsYXNzPVwiYWxlcnQgYWxlcnQtd2FybmluZyBoaWRlXCI+XFxyXFxuICAgICAgICDQktCy0LXQtNGR0L3QvdC+0LUg0L3QsNC30LLQsNC90LjQtSDRgdGD0YnQtdGB0YLQstGD0LXRgiDQsiDQkdCULiDQo9GB0YLQsNC90L7QstC40YLRjCDRgdCy0Y/Qt9GMPyZuYnNwOyZuYnNwOzxhIGlkPVwic2VsZWN0LWNvcnJcIiBjbGFzcz1cImJ0blwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj7QktGL0LHRgNCw0YLRjDwvYT5cXHJcXG4gICAgICA8L2Rpdj5cXHJcXG4gICAgICAgIDx1bCBpZD1cImNvcnItZHJvcGRvd24tbWVudVwiIGNsYXNzPVwiZHJvcGRvd24tbWVudVwiIHJvbGU9XCJtZW51XCIgYXJpYS1sYWJlbGxlZGJ5PVwiZHJvcGRvd25NZW51XCI+PC91bD5cXHJcXG4gICAgICA8L2Rpdj5cXHJcXG4gICAgICA8L2Rpdj5cXHJcXG4gICAgPC9kaXY+XFxyXFxuICAgIDxkaXYgY2xhc3M9XCJjb250cm9sLWdyb3VwXCI+XFxyXFxuICAgICAgPGxhYmVsIGNsYXNzPVwiY29udHJvbC1sYWJlbFwiIGZvcj1cImluY29taW5nLXR5cGVcIj7QotC40L88L2xhYmVsPlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9sc1wiPlxcclxcbiAgICAgICA8c2VsZWN0IGlkPVwiaW5jb21pbmctdHlwZVwiPlxcclxcbiAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIlwiPtCS0YvQsdC10YDQuNGC0LUg0LfQvdCw0YfQtdC90LjQtTwvb3B0aW9uPlxcclxcbiAgICAgICAgICAgICc7XG4gXyh3aW5kb3cuRElDVFMuaW5jb21pbmdfdHlwZSkuZWFjaChmdW5jdGlvbihyb3cpIHsgXG5fX3ArPSdcXHJcXG4gICAgICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cIicrXG4oKF9fdD0oIHJvdyApKT09bnVsbD8nJzpfX3QpK1xuJ1wiPicrXG4oKF9fdD0oIHJvdyApKT09bnVsbD8nJzpfX3QpK1xuJzwvb3B0aW9uPlxcclxcbiAgICAgICAgICAgICc7XG4gfSk7IFxuX19wKz0nXFxyXFxuICAgICAgIDwvc2VsZWN0PlxcclxcbiAgICAgIDwvZGl2PlxcclxcbiAgICA8L2Rpdj5cXHJcXG4gICAgPGRpdiBjbGFzcz1cImNvbnRyb2wtZ3JvdXBcIj5cXHJcXG4gICAgICA8bGFiZWwgY2xhc3M9XCJjb250cm9sLWxhYmVsXCIgZm9yPVwiaW5jb21pbmctbm90ZVwiPtCa0YDQsNGC0LrQvtC1INGB0L7QtNC10YDQttCw0L3QuNC1INC00L7QutGD0LzQtdC90YLQsDwvbGFiZWw+XFxyXFxuICAgICAgPGRpdiBjbGFzcz1cImNvbnRyb2xzXCI+XFxyXFxuICAgICAgICA8dGV4dGFyZWEgIGlkPVwiaW5jb21pbmctbm90ZVwiIGNsYXNzPVwic3BhbjVcIiBjb2xzPVwiMjBcIiByb3dzPVwiNVwiPjwvdGV4dGFyZWE+XFxyXFxuICAgICAgPC9kaXY+XFxyXFxuICAgIDwvZGl2PlxcclxcbiAgICA8ZGl2IGNsYXNzPVwiY29udHJvbC1ncm91cFwiPlxcclxcbiAgICAgIDxkaXYgY2xhc3M9XCJjb250cm9sc1wiPlxcclxcbiAgICAgICAgPGJ1dHRvbiBpZD1cImFkZC1idG5cIiB0eXBlPVwic3VibWl0XCIgY2xhc3M9XCJidG5cIj7Qn9C+0LvRg9GH0LjRgtGMINC90L7QvNC10YA8L2J1dHRvbj5cXHJcXG4gICAgICA8L2Rpdj5cXHJcXG4gICAgPC9kaXY+XFxyXFxuICA8L2Zvcm0+XFxyXFxuICA8ZGl2IGNsYXNzPVwic3BhbjVcIj5cXHJcXG4gICAgPGRpdiBjbGFzcz1cImFsZXJ0IGFsZXJ0LXN1Y2Nlc3MgaGlkZVwiPjwvZGl2PlxcclxcbiAgPC9kaXY+XFxyXFxuPC9kaXY+XFxyXFxuJztcbn1cbnJldHVybiBfX3A7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmope1xudmFyIF9fdCxfX3A9JycsX19qPUFycmF5LnByb3RvdHlwZS5qb2luLHByaW50PWZ1bmN0aW9uKCl7X19wKz1fX2ouY2FsbChhcmd1bWVudHMsJycpO307XG53aXRoKG9ianx8e30pe1xuX19wKz0nPHRyPlxcclxcbiAgPHRkPicrXG4oKF9fdD0oIG51bWJlciApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICA8dGQ+JytcbigoX190PSggZGF0ZSApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICA8dGQ+JytcbigoX190PSggY29ycmVzcG9uZGVudCApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICA8dGQ+JytcbigoX190PSggdHlwZSApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICA8dGQ+JytcbigoX190PSggbm90ZSApKT09bnVsbD8nJzpfX3QpK1xuJzwvdGQ+XFxyXFxuICA8dGQ+JytcbigoX190PSggd2luZG93Lk1BTkFHRVJTW3VzZXJdICkpPT1udWxsPycnOl9fdCkrXG4nPC90ZD5cXHJcXG48L3RyPlxcclxcbic7XG59XG5yZXR1cm4gX19wO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ob2JqKXtcbnZhciBfX3QsX19wPScnLF9faj1BcnJheS5wcm90b3R5cGUuam9pbixwcmludD1mdW5jdGlvbigpe19fcCs9X19qLmNhbGwoYXJndW1lbnRzLCcnKTt9O1xud2l0aChvYmp8fHt9KXtcbl9fcCs9Jzx0YWJsZSBjbGFzcz1cInRhYmxlLWJvcmRlcmVkIHRhYmxlXCI+XFxyXFxuICA8dGhlYWQ+XFxyXFxuICAgIDx0cj5cXHJcXG4gICAgIDx0aD7ihJY8L3RoPlxcclxcbiAgICAgPHRoPtCU0LDRgtCwPC90aD5cXHJcXG4gICAgIDx0aD7QntGCINC60L7Qs9C+PC90aD5cXHJcXG4gICAgIDx0aD7QotC40L88L3RoPlxcclxcbiAgICAgPHRoPtCa0YDQsNGC0LrQvtC1INGB0L7QtNC10YDQttCw0L3QuNC1PC90aD5cXHJcXG4gICAgIDx0aD7Qn9C+0LvRjNC30L7QstCw0YLQtdC70Yw8L3RoPlxcclxcbiAgICA8L3RyPlxcclxcbiAgPC90aGVhZD5cXHJcXG4gIDx0Ym9keSBjbGFzcz1cImluY29taW5nLXRhYmxlMVwiPjwvdGJvZHk+XFxyXFxuPC90YWJsZT5cXHJcXG4nO1xufVxucmV0dXJuIF9fcDtcbn07XG4iLCJ2YXIgSW5jb21pbmdUYWJsZVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL2luY29taW5nX3RhYmxlX3RlbXBsYXRlLmh0bWwnKTtcclxudmFyIEluY29taW5nSXRlbVRlbXBsYXRlID0gcmVxdWlyZSgnLi4vdGVtcGxhdGVzL2luY29taW5nX3RhYmxlX2l0ZW1fdGVtcGxhdGUuaHRtbCcpO1xyXG5cclxudmFyIEluY29taW5nVGFibGVWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG4gICBlbDogJCgnI2luY29taW5nLXRhYmxlJyksXHJcbiAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICB0aGlzLnRlbXBsYXRlID0gSW5jb21pbmdUYWJsZVRlbXBsYXRlO1xyXG4gICAgICAgdGhpcy5saXN0ZW5Ubyh0aGlzLmNvbGxlY3Rpb24sICdjaGFuZ2UgcmVzZXQgYWRkIHJlbW92ZScsIHRoaXMucmVuZGVyKTtcclxuICAgICAgIHRoaXMucmVuZGVyKCk7XHJcbiAgIH0sXHJcbiAgICByZW5kZXI6IGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKCkpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB0aGlzLiQoXCJ0Ym9keVwiKS5lbXB0eSgpO1xyXG4gICAgICAgIHRoaXMuY29sbGVjdGlvbi5tb2RlbHMubWFwKGZ1bmN0aW9uKGl0ZW0pe1xyXG4gICAgICAgICAgICBzZWxmLnJlbmRlck9uZShpdGVtKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH0sXHJcbiAgICByZW5kZXJPbmU6IGZ1bmN0aW9uKGl0ZW0pe1xyXG4gICAgICAgIHZhciBlbCA9IEluY29taW5nSXRlbVRlbXBsYXRlKGl0ZW0udG9KU09OKCkpO1xyXG4gICAgICAgIHRoaXMuJChcInRib2R5XCIpLnByZXBlbmQoZWwpO1xyXG4gICAgICAgIHJldHVybiBlbDtcclxuICAgIH1cclxufSk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEluY29taW5nVGFibGVWaWV3O1xyXG4iLCJ2YXIgSW5jb21pbmdNb2RlbCA9IHJlcXVpcmUoJy4uL21vZGVscy9pbmNvbWluZ19tb2RlbCcpO1xyXG52YXIgSW5jb21pbmdGb3JtVGVtcGxhdGUgPSByZXF1aXJlKCcuLi90ZW1wbGF0ZXMvaW5jb21pbmdfZm9ybV90ZW1wbGF0ZS5odG1sJyk7XHJcblxyXG52YXIgSW5jb21pbmdWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoe1xyXG4gIGVsOiAkKCcjaW5jb21pbmctZm9ybScpLFxyXG4gIGNvcnJfaXNfbmV3OnRydWUsXHJcbiAgb2xkX2NvcnJlc3BvbmRlbnQ6IFwiXCIsXHJcbiAgZmluZF9saXN0OltdLFxyXG4gIGV2ZW50czoge1xyXG4gICAgJ2NsaWNrICNhZGQtYnRuJzogJ2FkZE5ldycsXHJcbiAgICAnY2xpY2sgI3NlbGVjdC1jb3JyJzogJ2ZpbmRFeENvcnJlc3BvbmRlbnQnLFxyXG4gICAgJ2JsdXIgI2NvcnJlc3BvbmRlbnQnOiAnb25CbHVyJyxcclxuICAgICdrZXlkb3duICNjb3JyZXNwb25kZW50JzogJ29uS2V5UHJlc3MnLFxyXG4gICAgJ2tleXByZXNzICNjb3JyZXNwb25kZW50JzogJ29uS2V5UHJlc3MnXHJcbiAgfSxcclxuICBpbml0aWFsaXplOiBmdW5jdGlvbiAoKSB7XHJcbiAgICB0aGlzLnRlbXBsYXRlID0gSW5jb21pbmdGb3JtVGVtcGxhdGU7XHJcbiAgICB0aGlzLnJlbmRlcigpO1xyXG4gIH0sXHJcbiAgY29ycklzTmV3OiBmdW5jdGlvbihpc19uZXcpe1xyXG4gICAgdGhpcy5jb3JyX2lzX25ldyA9IGlzX25ldztcclxuICB9LFxyXG4gIGNvcnJBamF4OmZ1bmN0aW9uKGNvcnJfc3RyLCBvayl7XHJcbiAgICAkLmdldChcIi9oYW5kbGVycy9jbGllbnRuYW1lZmluZC8/dHlwZT1hZHJlc2F0JnE9XCIgKyBlbmNvZGVVUklDb21wb25lbnQoUm91dGluZS50cmltKGNvcnJfc3RyKSApKVxyXG4gICAgLmRvbmUob2spO1xyXG4gIH0sXHJcbiAgZmluZEV4Q29ycmVzcG9uZGVudDogZnVuY3Rpb24oKXtcclxuICAgIHZhciAkZGRtID0gdGhpcy4kKCcjY29yci1kcm9wZG93bi1tZW51Jyk7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgJGNvcnIgPSB0aGlzLiQoJyNjb3JyZXNwb25kZW50Jyk7XHJcbiAgICB0aGlzLiQoJyNjb3ItZXhpc3RzJykuaGlkZSgpO1xyXG4gICAgJGRkbS5lbXB0eSgpO1xyXG4gICAgdmFyIGRkX2xpID0gJyc7XHJcbiAgICB0aGlzLmZpbmRfbGlzdC5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xyXG4gICAgICBkZF9saSArPSAnPGxpPjxhIGRhdGEtbmFtZT1cIicrUm91dGluZS50cmltKGUubmFtZS5yZXBsYWNlKC9cXFwiL2csJyZxdW90OycpKSsnXCIgZGF0YS1pZD1cIicrZS5pZCsnXCIgdGFiaW5kZXg9XCItMVwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj4nK2UubmFtZSsnPGJyPjxzcGFuIGNsYXNzPVwic21hbGwtZ3JleVwiPicrZS5hZGRyKyc8L3NwYW4+PC9hPjwvbGk+JztcclxuICAgICAgfSk7XHJcbiAgICAkZGRtLmh0bWwoZGRfbGkpO1xyXG4gICAgaWYgKHRoaXMuZmluZF9saXN0Lmxlbmd0aCA+IDApXHJcbiAgICAgICRkZG0uc2hvdygpO1xyXG5cclxuICAgICAgICAkKCdhJywgJGRkbSkub24oJ2NsaWNrJywgZnVuY3Rpb24oKXtcclxuICAgICAgICAgICRjb3JyLnZhbCgkKHRoaXMpLmRhdGEoJ25hbWUnKS5yZXBsYWNlKCcmcXVvdDsnLCdcIicpKTtcclxuICAgICAgICAgICRjb3JyLmRhdGEoJ2lkJywgJCh0aGlzKS5kYXRhKCdpZCcpKTtcclxuICAgICAgICAgICRkZG0uaGlkZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gIH0sXHJcbiAgZmluZENvcnJlc3BvbmRlbnQ6IGZ1bmN0aW9uKCl7XHJcbiAgICB2YXIgJGNvcnIgPSB0aGlzLiQoJyNjb3JyZXNwb25kZW50Jyk7XHJcbiAgICB2YXIgY29ycl9zdHIgPSAkY29yci52YWwoKTtcclxuICAgIHZhciAkZGRtID0gdGhpcy4kKCcjY29yci1kcm9wZG93bi1tZW51Jyk7XHJcbiAgICAkZGRtLmhpZGUoKTtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICRjb3JyLmRhdGEoJ2lkJywgJycpO1xyXG4gICAgdGhpcy5maW5kX2xpc3QgPSBbXTtcclxuICAgIGlmIChjb3JyX3N0ci5sZW5ndGggPCAyKSByZXR1cm47XHJcbiAgICB2YXIgZG9uZSA9IGZ1bmN0aW9uKHJldCl7XHJcbiAgICAgICRkZG0uZW1wdHkoKTtcclxuICAgICAgICBpZiAocmV0LnJlc3VsdC5sZW5ndGggPiAwKXtcclxuICAgICAgICAgIHRoaXMuY29ycklzTmV3KGZhbHNlKTtcclxuICAgICAgICAgIHZhciBkZF9saSA9ICcnO1xyXG4gICAgICAgICAgcmV0LnJlc3VsdC5mb3JFYWNoKGZ1bmN0aW9uKGUpe1xyXG4gICAgICAgICAgICBpZiAoUm91dGluZS50cmltKGUubmFtZSkudG9Mb3dlckNhc2UoKSA9PT0gUm91dGluZS50cmltKGNvcnJfc3RyKS50b0xvd2VyQ2FzZSgpKXtcclxuICAgICAgICAgICAgICBzZWxmLmZpbmRfbGlzdC5wdXNoKGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGRkX2xpICs9ICc8bGk+PGEgZGF0YS1uYW1lPVwiJytSb3V0aW5lLnRyaW0oZS5uYW1lKS5yZXBsYWNlKC9cXFwiL2csJyZxdW90OycpKydcIiBkYXRhLXR5cGU9XCInK2UudHlwZSsnXCIgZGF0YS1pZD1cIicrZS5pZCsnXCIgdGFiaW5kZXg9XCItMVwiIGhyZWY9XCJqYXZhc2NyaXB0OjtcIj4nK2UubmFtZSsnPGJyPjxzcGFuIGNsYXNzPVwic21hbGwtZ3JleVwiPicrZS5hZGRyKyc8L3NwYW4+PC9hPjwvbGk+JztcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgJGRkbS5odG1sKGRkX2xpKTtcclxuICAgICAgICAgICRkZG0uc2hvdygpO1xyXG4gICAgICAgICQoJ2EnLCAkZGRtKS5vbignY2xpY2snLCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgJGNvcnIudmFsKCQodGhpcykuZGF0YSgnbmFtZScpLnRvU3RyaW5nKCkucmVwbGFjZSgnJnF1b3Q7JywnXCInKSk7XHJcbiAgICAgICAgICAkY29yci5kYXRhKCdpZCcsICQodGhpcykuZGF0YSgnaWQnKSk7XHJcbiAgICAgICAgICAkY29yci5kYXRhKFwidHlwZVwiLCQodGhpcykuZGF0YShcInR5cGVcIikpO1xyXG4gICAgICAgICAgJGRkbS5oaWRlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2V7XHJcbiAgICAgICAgICB0aGlzLmNvcnJJc05ldyh0cnVlKTtcclxuICAgICAgICB9XHJcbiAgICB9LmJpbmQodGhpcyk7XHJcbiAgICB0aGlzLmNvcnJBamF4KGNvcnJfc3RyLGRvbmUpO1xyXG4gIH0sXHJcbiAgLyoqXHJcbiAgICog0JDQstGC0L7QstGL0LHQvtGAINC60L7RgNGA0LXRgdC/0L7QvdC00LXQvdGC0LBcclxuICAqKi9cclxuICBhdXRvc2VsZWN0Q29ycjogZnVuY3Rpb24oKXtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIHZhciBuYW1lID0gdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpLnZhbCgpO1xyXG4gICAgaWYgKG5hbWUgIT0gJycpXHJcbiAgICB7XHJcbiAgICAgIGlmKHRoaXMuZmluZF9saXN0Lmxlbmd0aCA+IDApXHJcbiAgICAgIHtcclxuICAgICAgICAvL3RoaXMuJCgnI2Nvci1leGlzdHMnKS5zaG93KCk7XHJcbiAgICAgICAgYm9vdGJveC5jb25maXJtKHtcclxuICAgICAgICAgICAgbWVzc2FnZTogJ9CS0LLQtdC00ZHQvdC90L7QtSDQvdCw0LfQstCw0L3QuNC1INGB0YPRidC10YHRgtCy0YPQtdGCINCyINCR0JQuINCj0YHRgtCw0L3QvtCy0LjRgtGMINGB0LLRj9C30Yw/JyxcclxuICAgICAgICAgICAgYnV0dG9uczoge1xyXG4gICAgICAgICAgICAgICdjYW5jZWwnOiB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ9Cd0LXRgicsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAnY29uZmlybSc6IHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAn0JTQsCcsXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBjYWxsYmFjazogZnVuY3Rpb24ocmVzdWx0KSB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlc3VsdClcclxuICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICBpZihzZWxmLmZpbmRfbGlzdC5sZW5ndGggPT09IDEpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNlbGYuJCgnI2NvcnJlc3BvbmRlbnQnKS5kYXRhKCdpZCcsIHNlbGYuZmluZF9saXN0WzBdLmlkKTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICBzZWxmLmZpbmRFeENvcnJlc3BvbmRlbnQoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgb25LZXlQcmVzczogZnVuY3Rpb24oZSlcclxuICB7XHJcbiAgICBpZihlLmtleUNvZGUhPTEzKXtcclxuICAgICAgdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpLmRhdGEoJ2lkJywnJyk7XHJcbiAgICAgIHRoaXMuY29ycklzTmV3KHRydWUpO1xyXG4gICAgICB0aGlzLmZpbmRfbGlzdCA9IFtdO1xyXG4gICAgfVxyXG4gICAgIC8vY29uc29sZS5sb2coXCIxXCIpO1xyXG4gIH0sXHJcbiAgLyoqXHJcbiAgICog0J/QvtGC0LXRgNGPINGE0L7QutGD0YHQsCDQvdCwINC/0L7Qu9C1INCy0LLQvtC00LAg0LrQvtGA0YDQtdGB0L/QvtC90LTQtdC90YLQsFxyXG4gICoqL1xyXG4gIG9uQmx1cjogZnVuY3Rpb24oZSlcclxuICB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBzZXRUaW1lb3V0KCBmdW5jdGlvbigpXHJcbiAgICB7XHJcbiAgICAgIHZhciAkY29yciA9IHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKTtcclxuICAgICAgaWYoJGNvcnIudmFsKCkpXHJcbiAgICAgIHtcclxuICAgICAgICAgICB2YXIgJGRkbSA9IHRoaXMuJCgnI2NvcnItZHJvcGRvd24tbWVudScpO1xyXG4gICAgICAgICAgIGlmICgkZGRtLmlzKCc6dmlzaWJsZScpKVxyXG4gICAgICAgICAgICAkZGRtLmhpZGUoKTtcclxuXHJcbiAgICAgICAgIC8vaWYgKHRoaXMuY29ycl9pc19uZXcgJiYgJGNvcnIuZGF0YSgnaWQnKSA9PT0gJycpXHJcbiAgICAgICAgIGlmIChzZWxmLmZpbmRfbGlzdC5sZW5ndGg8MSAgJiYgJGNvcnIuZGF0YSgnaWQnKSA9PT0gJycpXHJcblxyXG4gICAgICAgICB7XHJcbiAgICAgICAgICBib290Ym94LmNvbmZpcm0oe1xyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICfQktCy0LXQtNC10L3QviDQvdC+0LLQvtC1INC30L3QsNGH0LXQvdC40LUsINC60L7RgtC+0YDQvtC1INC90LUg0L3QsNC50LTQtdC90L4g0LIg0JHQlCEg0K3RgtC+INC80L7QttC10YIg0L/RgNC40LLQtdGB0YLQuCDRgSDQt9Cw0YXQu9Cw0LzQu9C10L3QuNGOINCR0JQg0Lgg0L3QsNGA0YPRiNC10L3QuNGOINCy0LDQttC90YvRhSDRgdCy0Y/Qt9C10LkuIDxici8+0JLQvtC30LzQvtC20L3Qviwg0YLRgNC10LHRg9C10YLRgdGPINC40LfQvNC10L3QuNGC0Ywg0L3QsNC/0LjRgdCw0L3QuNC1INC30L3QsNGH0LXQvdC40Y8g0LjQu9C4INC10LPQviDRhNC+0YDQvNGD0LvQuNGA0L7QstC60YMuIDxici8+0KXQvtGC0LjRgtC1INC/0L7Qv9GA0L7QsdC+0LLQsNGC0Ywg0LTRgNGD0LPQvtC1INC90LDQv9C40YHQsNC90LjQtSwg0YfRgtC+0LHRiyDQv9C+0LTQvtCx0YDQsNGC0Ywg0L7QtNC90L4g0LjQtyDRg9C20LUg0YHRg9GJ0LXRgdGC0LLRg9GO0YnQuNGFINCyINCR0JQg0LfQvdCw0YfQtdC90LjQuT8nLFxyXG4gICAgICAgICAgICAgIGJ1dHRvbnM6IHtcclxuICAgICAgICAgICAgICAgICdjYW5jZWwnOiB7XHJcbiAgICAgICAgICAgICAgICAgIGxhYmVsOiAn0J3QtdGCJyxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAnY29uZmlybSc6IHtcclxuICAgICAgICAgICAgICAgICAgbGFiZWw6ICfQlNCwJyxcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihyZXN1bHQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXN1bHQpXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLiQoJyNjb3JyZXNwb25kZW50JykuZm9jdXMoKTtcclxuICAgICAgICAgICAgICAgICAgfS5iaW5kKHNlbGYpLCAxMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLy9zZXRUaW1lb3V0KCBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgdmFyICRjb3JyID0gdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpO1xyXG4gICAgICAgICAgdmFyICRjb3JyX2V4ID0gdGhpcy4kKCcjY29yLWV4aXN0cycpO1xyXG4gICAgICAgICAgLy9pZiAoIXRoaXMuY29ycl9pc19uZXcgJiYgJGNvcnIuZGF0YSgnaWQnKSA9PT0gJycpe1xyXG4gICAgICAgICAgaWYgKHNlbGYuZmluZF9saXN0Lmxlbmd0aD4wICYmICRjb3JyLmRhdGEoJ2lkJykgPT09ICcnKXtcclxuICAgICAgICAgICAgdGhpcy5hdXRvc2VsZWN0Q29ycigpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL30uYmluZCh0aGlzKSwyMDApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgIH0uYmluZCh0aGlzKSwyMDApO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqINCg0LXQvdC00LXRgNC40L3Qs1xyXG4gICoqL1xyXG4gIHJlbmRlcjogZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy4kZWwuaHRtbCh0aGlzLnRlbXBsYXRlKCkpO1xyXG4gICAgdmFyICRjb3JyID0gdGhpcy4kKCcjY29ycmVzcG9uZGVudCcpO1xyXG4gICAgdGhpcy4kKCcjY29yci1kcm9wZG93bicpLmRyb3Bkb3duKCk7XHJcbiAgICB2YXIgZGVib3VuY2VkID0gXy5kZWJvdW5jZSh0aGlzLmZpbmRDb3JyZXNwb25kZW50LmJpbmQodGhpcyksIDMwMCk7XHJcbiAgICAkY29yci5vbigna2V5dXAnLCBkZWJvdW5jZWQpO1xyXG4gICAgJGNvcnIub24oJ2ZvY3VzaW4nLCBmdW5jdGlvbigpe1xyXG4gICAgICB0aGlzLiQoJy5hbGVydC1zdWNjZXNzJykuaHRtbCgnJykuaGlkZSgpO1xyXG4gICAgICB0aGlzLiQoJyNjb3ItZXhpc3RzJykuaGlkZSgpO1xyXG4gICAgfS5iaW5kKHRoaXMpKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH0sXHJcblxyXG4gIC8qKlxyXG4gICAqINCU0L7QsdCw0LLQu9C10L3QuNC1XHJcbiAgKiovXHJcbiAgYWRkTmV3OiBmdW5jdGlvbiAoZSkge1xyXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgdGhpcy4kKCcjY29yLWV4aXN0cycpLmhpZGUoKTtcclxuICAgIHZhciAkY29yciA9IHRoaXMuJCgnI2NvcnJlc3BvbmRlbnQnKTtcclxuICAgIGlmICh0aGlzLiQoJyNpbmNvbWluZy10eXBlJykudmFsKCkgPT09IFwiXCIpe1xyXG4gICAgICAkLmpHcm93bCgn0JLRi9Cx0LXRgNC40YLQtSDRgtC40L8hJywgeyAndGhlbWVTdGF0ZSc6J2dyb3dsLWVycm9yJywgJ3N0aWNreSc6ZmFsc2UsIGxpZmU6IDUwMDAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBjb3JyX25hbWUgPSBSb3V0aW5lLnRyaW0oJGNvcnIudmFsKCkpO1xyXG4gICAgaWYgKGNvcnJfbmFtZSA9PT0gXCJcIil7XHJcbiAgICAgICQuakdyb3dsKCfQktGL0LHQtdGA0LjRgtC1INC60L7RgNGA0LXRgdC/0L7QvdC00LXQvdGC0LAhJywgeyAndGhlbWVTdGF0ZSc6J2dyb3dsLWVycm9yJywgJ3N0aWNreSc6ZmFsc2UsIGxpZmU6IDUwMDAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0aGlzLiQoJyNpbmNvbWluZy1ub3RlJykudmFsKCkgPT09IFwiXCIpe1xyXG4gICAgICAkLmpHcm93bCgn0JLQstC10LTQuNGC0LUg0LrRgNCw0YLQutC+0LUg0YHQvtC00LXRgNC20LDQvdC40LUg0LTQvtC60YPQvNC10L3RgtCwIScsIHsgJ3RoZW1lU3RhdGUnOidncm93bC1lcnJvcicsICdzdGlja3knOmZhbHNlLCBsaWZlOiA1MDAwIH0pO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgbWQgPSBuZXcgSW5jb21pbmdNb2RlbCgpO1xyXG4gICAgUm91dGluZS5zaG93TG9hZGVyKCk7XHJcbiAgICBtZC5zZXQoe1xyXG4gICAgICBjb3JyZXNwb25kZW50OiBjb3JyX25hbWUsXHJcbiAgICAgIHR5cGU6IHRoaXMuJCgnI2luY29taW5nLXR5cGUnKS52YWwoKSxcclxuICAgICAgbm90ZTogdGhpcy4kKCcjaW5jb21pbmctbm90ZScpLnZhbCgpLFxyXG4gICAgICBudW1iZXI6IDAsXHJcbiAgICAgIGRhdGU6ICcnXHJcbiAgICB9KTtcclxuICAgIGlmKCRjb3JyLmRhdGEoJ3R5cGUnKT09XCJjb250cmFnZW50XCIpXHJcbiAgICAgIG1kLnNldChcImNvbnRyYWdlbnRfaWRcIiwkY29yci5kYXRhKCdpZCcpKTtcclxuICAgIGVsc2VcclxuICAgICAgbWQuc2V0KFwiY29ycmVzcG9uZGVudF9pZFwiLCRjb3JyLmRhdGEoJ2lkJykpO1xyXG4gICAgbWQuc2F2ZSgpLmRvbmUoZnVuY3Rpb24gKHJldCkge1xyXG4gICAgICBzZWxmLmNvbGxlY3Rpb24uYWRkKHJldC5kYXRhKTtcclxuICAgICAgc2VsZi4kKCcjY29ycmVzcG9uZGVudCcpLnZhbChcIlwiKS5kYXRhKCdpZCcsJycpO1xyXG4gICAgICBzZWxmLiQoJyNpbmNvbWluZy1uYW1lJykudmFsKFwiXCIpO1xyXG4gICAgICBzZWxmLiQoJyNpbmNvbWluZy10eXBlJykudmFsKFwiXCIpO1xyXG4gICAgICBzZWxmLiQoJyNpbmNvbWluZy1ub3RlJykudmFsKFwiXCIpO1xyXG4gICAgICBzZWxmLiQoJyNjb3JyZXNwb25kZW50JykuZGF0YSgnaWQnLCcnKTtcclxuICAgICAgc2VsZi5jb3JyX2lzX25ldyA9IHRydWU7XHJcbiAgICAgIHNlbGYuJCgnLmFsZXJ0LXN1Y2Nlc3MnKS5odG1sKCfQmNGB0YUuIOKEliAnK3JldC5kYXRhLm51bWJlcisnINC+0YIgJysgcmV0LmRhdGEuZGF0ZSlcclxuICAgICAgICAuc2hvdygpO1xyXG4gICAgfSkuYWx3YXlzKGZ1bmN0aW9uKCl7Um91dGluZS5oaWRlTG9hZGVyKCk7fSk7XHJcbiAgfVxyXG59KTtcclxubW9kdWxlLmV4cG9ydHMgPSBJbmNvbWluZ1ZpZXc7XHJcbiJdfQ==
