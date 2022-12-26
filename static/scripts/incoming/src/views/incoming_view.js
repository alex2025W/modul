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
