///
/// Представление формы настройки параметров выгрузки
///
App.Views.downloadSettingsForm = Backbone.View.extend({
selectedSectors : [],
selectedTeams : [],
selectedMonths : [],
selectedYears : [],
templates: {
    item_templateSector:_.template($("#filterItemTemplateSector").html()),
    item_templateTeam:_.template($("#filterItemTemplateTeam").html()),
    template:_.template($("#downloadSettingsForm").html()),
  },

parent_type:'',
events:{
  'click .btn-save':'onSaveClick',
},

initialize:function(){
  this.render();
},

render:function(){
  var self = this;

  //console.log(Routine.getRangeYears(2,0));
  this.$el.append(this.templates.template());
  this.$el.modal({close: function(){}});
  this.$el.on('hidden', function () { self.trigger("dialogclose"); })


  // заполнение участков
  // подключение мультиселекта на участки
  this.selectedSectors = [];
  this.$('.ddl-sectors').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Выберите",
      nSelectedText: "",
      selectAllText: "Все",
      maxHeight: 300,
      maxWidth: 300,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Выберите <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = '';
            options.each(function() {
              selected += $(this).val() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            if(checked === true)
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedSectors = [];
                // take only visible elems
                 $(self.el).find('.ddl-sectors' ).next().find('input:visible').each(function(){
                  //visibleElems[$(this).val()] = $(this).val();
                  if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                    self.selectedSectors.push($(this).val());
                 });
              }
              else
                self.selectedSectors.push(element.val());
                //self.selectedSectors[0] = element.val();
            }
            else
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedSectors = [];
              }
              else
              {
                if(self.selectedSectors.indexOf(element.val())>-1)
                  self.selectedSectors.splice(self.selectedSectors.indexOf(element.val()),1);
              }
            }
        }
    });
  this.fillSectors(App.sectorsList);

   // заполнение бригад
  // подключение мультиселекта на бригады
  this.selectedTeams = [];
  this.$('.ddl-teams').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering: true,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Выберите",
      nSelectedText: "",
      selectAllText: "Все",
      maxHeight: 300,
      maxWidth: 300,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Выберите <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = '';
            options.each(function() {
              selected += $(this).text() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            if(checked === true)
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedTeams = [];
                // take only visible elems
                 $(self.el).find('.ddl-teams' ).next().find('input:visible').each(function(){
                  //visibleElems[$(this).val()] = $(this).val();
                  if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                    self.selectedTeams.push($(this).val());
                 });
              }
              else
                self.selectedTeams.push(element.val());
                //self.selectedSectors[0] = element.val();
            }
            else
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedTeams = [];
              }
              else
              {
                if(self.selectedTeams.indexOf(element.val())>-1)
                  self.selectedTeams.splice(self.selectedTeams.indexOf(element.val()),1);
              }
            }
        }
    });
  this.fillTeams(App.Teams);


  // подключение месяцов
  this.selectedMonths = [];
  var d = new Date();
  this.$('.ddl-months').find('option[value="' + (d.getMonth()).toString() + '"]').prop('selected', true);
  this.selectedMonths.push(d.getMonth());
  this.$('.ddl-months').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering:  false,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Выберите",
      nSelectedText: "",
      selectAllText: "Все",
      maxHeight: 200,
      maxWidth: 300,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Выберите <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = '';
            options.each(function() {
              selected += $(this).html() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            if(checked === true)
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedMonths = [];
                // take only visible elems
                 $(self.el).find('.ddl-months' ).next().find('input:visible').each(function(){
                  //visibleElems[$(this).val()] = $(this).val();
                  if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                    self.selectedMonths.push($(this).val());
                 });
              }
              else
                //self.selectedMonths.push(element.val());
                self.selectedMonths[0] = element.val();
            }
            else
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedMonths = [];
              }
              else
              {
                if(self.selectedMonths.indexOf(element.val())>-1)
                  self.selectedMonths.splice(self.selectedMonths.indexOf(element.val()),1);
              }
            }
        }
    });

   // подключение годов
  this.selectedYears = [];
  this.$('.ddl-years').multiselect({
      buttonContainer: '<span class="dropdown" />',
      includeSelectAllOption: true,
      enableCaseInsensitiveFiltering:  false,
      numberDisplayed: 4,
      filterPlaceholder: 'Найти',
      nonSelectedText: "Выберите",
      nSelectedText: "",
      selectAllText: "Все",
      maxHeight: 200,
      maxWidth: 300,
       buttonText: function(options) {
          if (options.length === 0) {
            return 'Выберите <b class="caret"></b>';
          }
          else if (options.length > this.numberDisplayed) {
              return this.nSelectedText+options.length + ' ' +  ' <b class="caret"></b>';
          }
          else {
            var selected = '';
            options.each(function() {
              selected += $(this).html() + ', ';
            });
            return selected.substr(0, selected.length -2) + ' <b class="caret"></b>';
          }
        },
        onChange: function(element, checked) {
            if(checked === true)
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedYears = [];
                // take only visible elems
                 $(self.el).find('.ddl-years' ).next().find('input:visible').each(function(){
                  //visibleElems[$(this).val()] = $(this).val();
                  if($(this).val()!="" && $(this).val()!='multiselect-all' && !$(this).prop('disabled'));
                    self.selectedYears.push($(this).val());
                 });
              }
              else
                //self.selectedYears.push(element.val());
                self.selectedYears[0] = element.val();
            }
            else
            {
              if(element.val()=='multiselect-all')
              {
                self.selectedYears = [];
              }
              else
              {
                if(self.selectedYears.indexOf(element.val())>-1)
                  self.selectedYears.splice(self.selectedYears.indexOf(element.val()),1);
              }
            }
        }
    });
    this.fillYears(Routine.getRangeYears(1,0));

},

/**
 * Обработка кнопки сохранения
**/
onSaveClick:function(){
  if(this.selectedMonths.length>0 && this.selectedYears.length==0)
  {
    $.jGrowl('Задайте год, по которому необходимо получить данные.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    return;
  }
  this.trigger("startdownload");
  this.$el.modal('hide');
  this.$el.remove();
},

/**
 * Заполнение выпадающего списка участков
**/
fillSectors: function(data)
{
    var ddl = this.$(".ddl-sectors").empty();
    //this.selectedSectors.push(data[Object.keys(data)[0]]['code']);
    for(var i in data)
      $(ddl).append(this.templates.item_templateSector(data[i]));

    $(ddl).multiselect('rebuild');
},

/**
 * Заполнение выпадающего списка бригад
**/
fillTeams: function(data)
{
    var ddl = this.$(".ddl-teams").empty();
    for(var i in data)
      $(ddl).append(this.templates.item_templateTeam(data[i]));
    $(ddl).multiselect('rebuild');
},

/**
 * Заполнение выпадающего списка годов
**/
fillYears: function(data)
{
    var ddl = this.$(".ddl-years").empty();
    this.selectedYears.push(data[data.length-1]);
    //$(ddl).append('<option selected value = "" ></option>');
    for(var i in data)
    {
      if(i==data.length-1)
        $(ddl).append('<option selected value = "'+data[i].toString()+'" >'+data[i].toString()+'</option>');
      else
        $(ddl).append('<option value = "'+data[i].toString()+'" >'+data[i].toString()+'</option>');
    }
    $(ddl).multiselect('rebuild');
}
});
