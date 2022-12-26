$(function () {
  var DirModel = Backbone.Model.extend({});

  var AppView = Backbone.View.extend({
    initialize: function () {
      // Первый контакт
      var fc = new DirView({
        el: $('#first-contact')
      });
      fc.dirtype = 1;

      // Откуда узнали о нас
      var wf = new DirView({
        el: $('#where-find')
      });
      wf.dirtype = 2;

      // Тип конструкции
      var os = new OrderStatusView();
      var ct = new DirView({
        el: $('#construction-type')
      });
      ct.dirtype = 4;

      // Назначение конструкции
      var cnt = new DirView({
        el: $('#construction-target')
      });
      cnt.dirtype = 5;

      // Задачи
      var cnt = new DirView({
        el: $('#tasks')
      });
      cnt.dirtype = 6;

      var otk = new DirView({
        el: $('#otkaz')
      });
      otk.dirtype = 7;

      var rassm = new DirView({
        el: $('#rassm')
      });
      rassm.dirtype = 13;

      var otk8 = new DirView({
        el: $('#claims-category')
      });
      otk8.dirtype = 8;

      var otk9 = new DirView({
        el: $('#kind-services')
      });
      otk9.dirtype = 9;

      var otk10 = new DirView({
        el: $('#warehouse')
      });
      otk10.dirtype = 10;

      var otk12 = new DirView({
        el: $('#clienttype')
      });
      otk12.dirtype = 12;

      var otk15 = new DirView({
        el: $('#inboxtype')
      });
      otk15.dirtype = 15;

      var otk16 = new PriceTypeView();
      var abc = new ABCSpecificationView();
      var standart = new StandartCostsView();
      var op = new OrderPositionView();
      // Табель учета раб. дней
      var ts = new TimeSheetView();

      // Представление для справочника Направлений работ по учаскам
      // dirtype = 18
      var sectorTypesView = new SectorTypesView();

      // Представление для срправочника - Сроки
      // dirtype = 19
      var terms = new TermsView();

      // Тэги материалов
      var otk21 = new DirView({el: $('#material_tags')});
      otk21.dirtype = 21;
    }
  });


  var OrderPositionView = Backbone.View.extend({
    dirtype: 17,
    el: $('#order_position'),
    events: {
      'change .is-enabled': 'changeEnable',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'mode': 'inline',
        'rows': 3,
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {

        $(this).editable('option', 'pk', params.newValue);
      });
    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      // if (ch.is('.event-need')){
      //     data.need_event = ch.is(':checked');
      // }
      // else{
       data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      //}
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {

          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);

        }
      });
    },
    addNew: function () {
      var name = this.$('.new-dir-name').val();
      var note = this.$('.new-dir-note').val();
      if (name == '' || note == '')
        return;
      var self = this;
      var data = new Object();
      data.name = name;
      data.note = note;
      data.stat = 'enabled';
      data.need_event = false;
      data.code = 9999;

      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {
          var tmpl = _.template($('#orderPositionTemplate').html());
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);

          self.$('table tbody').append(tmpl(dr.toJSON()));
          self.$('.editable').editable({
            'mode': 'inline',
            'rows': 3,
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          self.$('.new-dir-name').val('');
          self.$('.new-dir-note').val('');
        }
      });

    }
  });


  var PriceTypeView = Backbone.View.extend({
    dirtype: 16,
    el: $('#payment_type'),
    events: {
      'change .is-enabled': 'changeEnable',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'placement': 'bottom',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {

        $(this).editable('option', 'pk', params.newValue);
      });
    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      if (ch.is('.event-need')){
        data.need_event = ch.is(':checked');
      }
      else{
       data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      }
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {

          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);

        }
      });
    },
    addNew: function () {
      var name = this.$('.new-dir-name').val();
      var note = this.$('.new-dir-note').val();
      if (name == '' || note == '')
        return;
      var self = this;
      var data = new Object();
      data.name = name;
      data.note = note;
      data.stat = 'enabled';
      data.need_event = false;
      data.code = 9999;

      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {
          var tmpl = _.template($('#priceItemTemplate').html());
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);

          self.$('table tbody').append(tmpl(dr.toJSON()));
          self.$('.editable').editable({
            'placement': 'right',
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          self.$('.new-dir-name').val('');
          self.$('.new-dir-note').val('');
        }
      });

    }
  });


  var DirView = Backbone.View.extend({
    dirtype: null,
    el: null,
    events: {
      'change .is-enabled': 'changeEnable',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'placement': 'right',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {

        $(this).editable('option', 'pk', params.newValue);
      });
    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {

          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);

        }
      });
    },
    addNew: function () {
      var name = this.$('.new-dir-name').val();
      if (name == '')
        return;
      var self = this;
      var data = new Object();
      data.name = name;
      data.stat = 'enabled';
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {
          var tmpl = _.template($('#dirItemTemplate').html());
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);

          self.$('table tbody').append(tmpl(dr.toJSON()));
          self.$('.editable').editable({
            'placement': 'right',
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          self.$('.new-dir-name').val('');
        }
      });

    }
  });

  var OrderStatusView = Backbone.View.extend({
    dirtype: 3,
    el: $('#order-status'),
    events: {
      'change .is-enabled': 'changeEnable',
      'change .is-price': 'changePrice',
      'change .is-structure': 'changeStructure',
      'change .is-sq': 'changeSq',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'placement': 'right',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {
        $(this).editable('option', 'pk', params.newValue);
      });
      this.$('.editable2').editable({
        'placement': 'left',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      });
      this.$('.editable3').editable({
        'placement': 'left',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      });
    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;

      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {
          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);
        }
      });
    },
    changePrice: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.price = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;

      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {}
      });
    },
    changeStructure: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.structure = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;

      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {}
      });
    },
    changeSq: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.sq = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;

      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {}
      });
    },
    addNew: function () {
      var name = this.$('.new-dir-name').val();
      if (name == '')
        return;
      var self = this;
      var data = new Object();
      data.name = name;
      data.stat = 'enabled';
      data.type = this.dirtype;
      data.property = this.$('.property').val();
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          alert('error');
        },
        success: function (result, textStatus, jqXHR) {
          var tmpl = _.template($('#dirItemTemplate2').html());
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);

          self.$('table tbody').append(tmpl(dr.toJSON()));
          self.$('.editable').editable({
            'placement': 'right',
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          self.$('.editable2').editable({
            'placement': 'left',
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          });
          self.$('.new-dir-name').val('');
        }
      });

    }
  });

  var ABCSpecificationView = Backbone.View.extend({
    dirtype: 11,
    el: $('#ABCclassification'),
    events: {
      'click .btn-abc-save': 'onSave'
    },
    initialize: function () {
      this.$('input').numeric({
        decimal: false,
        negative: false
      });
      this.data_id = $(".abc_id").val();
    },
    onSave: function () {
      var data = new Object();
      data['client_a_sum'] = this.$(".client-a-sum").val() ? parseInt(this.$(".client-a-sum").val()) : '';
      data['client_c_sum'] = this.$(".client-c-sum").val() ? parseInt(this.$(".client-c-sum").val()) : '';
      data['client_a_square'] = this.$(".client-a-square").val() ? parseInt(this.$(".client-a-square").val()) : '';
      data['client_c_square'] = this.$(".client-c-square").val() ? parseInt(this.$(".client-c-square").val()) : '';

      data['order_a_sum'] = this.$(".order-a-sum").val() ? parseInt(this.$(".order-a-sum").val()) : '';
      data['order_c_sum'] = this.$(".order-c-sum").val() ? parseInt(this.$(".order-c-sum").val()) : '';
      data['order_a_square'] = this.$(".order-a-square").val() ? parseInt(this.$(".order-a-square").val()) : '';
      data['order_c_square'] = this.$(".order-c-square").val() ? parseInt(this.$(".order-c-square").val()) : '';
      data['stat'] = 'enabled';
      data['type'] = this.dirtype;
      data['name'] = 'ABC классификация';
      if (this.data_id) {
        data['id'] = this.data_id;
        $.ajax({
          url: '/handlers/upddirid',
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: $.toJSON(data),
          timeout: 35000,
          error: function (jqXHR, textStatus, errorThrown) {
            $.jGrowl('Ошибка сохранения.', {
              'themeState': 'growl-error',
              'sticky': false,
              life: 5000
            });
          },
          success: function (result, textStatus, jqXHR) {
            this.data_id = result['id'];
            $.jGrowl('Данные успешно сохранены.', {
              'themeState': 'growl-success',
              'sticky': false,
              life: 5000
            });
          }
        });
      } else {
        $.ajax({
          url: '/handlers/dir',
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: $.toJSON(data),
          timeout: 35000,
          error: function (jqXHR, textStatus, errorThrown) {
            $.jGrowl('Ошибка сохранения.', {
              'themeState': 'growl-error',
              'sticky': false,
              life: 5000
            });
          },
          success: function (result, textStatus, jqXHR) {
            this.data_id = result['id'];
            $.jGrowl('Данные успешно сохранены.', {
              'themeState': 'growl-success',
              'sticky': false,
              life: 5000
            });
          }
        });
      }
    }
  });


  var StandartCostsView = Backbone.View.extend({
    dirtype: 14,
    el: $('#standartcosts'),
    initialize: function () {
      this.$('input').numeric({
        decimal: false,
        negative: false
      });
    },
    events: {
      'change input': 'onDataChanged'
    },
    onDataChanged: function (e) {
      var id = $(e.target).data("id");
      var data = {
        id: id,
        'stat': 'enabled',
        'name': $(e.target).data('name'),
        'value': $(e.target).val() ? parseInt($(e.target).val()) : '',
        'type': this.dirtype,
        'number': parseInt($(e.target).data('number'))
      }
      $.ajax({
        url: '/handlers/upddirid',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          $.jGrowl('Ошибка сохранения.', {
            'themeState': 'growl-error',
            'sticky': false,
            life: 5000
          });
        },
        success: function (result, textStatus, jqXHR) {
          this.data_id = result['id'];
          $.jGrowl('Данные успешно сохранены.', {
            'themeState': 'growl-success',
            'sticky': false,
            life: 5000
          });
        }
      });
    }
  });

  ///--------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  /// Представление для работы с видами участков---------------------------------------------------------------------------------------------
  ///---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  var SectorTypesView = Backbone.View.extend({
    dirtype: 18,
    el: $('#sector_type'),
    events: {
      'change .is-enabled': 'changeEnable',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'mode': 'inline',
        'rows': 3,
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {
        $(this).editable('option', 'pk', params.newValue);
      });
      this.$('.editable2').editable({
        'placement': 'left',
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      });

      // навешиваем контрол автоподбора ответственных пользователей для каждого направления
      this.$('.resposible-users-row').each(function(i){
        var box = this;
        var tmp_tokens = [];
        if($(box).find('.htb-responsible-users').val())
           tmp_tokens = JSON.parse($(box).find('.htb-responsible-users').val());
        $(box).find(".responsible-users").tokenInput("/handlers/users/search/",{
          theme: "facebook",
          zindex:1300,
          hintText:"Введите для поиска",
          noResultsText:"Ничего не найдено",
          searchingText:"Поиск...",
          allowFreeTagging:false,
          preventDuplicates:true,
          onAdd: function(e){
            $(box).find('.htb-responsible-users').val(JSON.stringify($(box).find(".responsible-users").tokenInput('get')));
            //console.log($(box).find('.htb-responsible-users').val());
            // сохранение а БД
            self.saveResponsibleUsers($(box).parent('tr:first').data('id') , $(box).find('.htb-responsible-users').val());
          },
          onDelete: function(e){
            $(box).find('.htb-responsible-users').val(JSON.stringify($(box).find(".responsible-users").tokenInput('get')));
            //console.log($(box).find('.htb-responsible-users').val());
            self.saveResponsibleUsers($(box).parent('tr:first').data('id') , $(box).find('.htb-responsible-users').val());
          },
          prePopulate: tmp_tokens
        });
      });

    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {
          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);
        }
      });
    },

    addNew: function () {
      var self = this;
      if (name == this.$('.new-dir-name').val())
        return;
      var name = this.$('.new-dir-name').val();
      var data = new Object();
      data.name = name;
      data.stat = 'enabled';
      data.users = [];
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
        },
        success: function (result, textStatus, jqXHR) {
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);
          var box = $(Routine.trim(_.template($('#sectorTypeItemTemplate').html())(dr.toJSON())));

          self.$('table tbody').append(box);
          $(box).find('.editable').editable({
            'mode': 'inline',
            'rows': 3,
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          $(box).find('.editable2').editable({
            'placement': 'left',
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          });

          $(box).find(".responsible-users").tokenInput("/handlers/users/search/",{
              theme: "facebook",
              zindex:1300,
              hintText:"Введите для поиска",
              noResultsText:"Ничего не найдено",
              searchingText:"Поиск...",
              allowFreeTagging:false,
              preventDuplicates:true,
              onAdd: function(e){
                $(box).find('.htb-responsible-users').val(JSON.stringify($(box).find(".responsible-users").tokenInput('get')));
                //console.log($(box).find('.htb-responsible-users').val());
                self.saveResponsibleUsers(dr.get('name'), $(box).find('.htb-responsible-users').val());
              },
              onDelete: function(e){
                $(box).find('.htb-responsible-users').val(JSON.stringify($(box).find(".responsible-users").tokenInput('get')));
                //console.log($(box).find('.htb-responsible-users').val());
                self.saveResponsibleUsers(dr.get('name'), $(box).find('.htb-responsible-users').val());
              },
              prePopulate: []
          });
          self.$('.new-dir-name').val('');
        }
      });
    },

    saveResponsibleUsers: function(id, users){
      var data = new Object();
      data.type = this.dirtype;
      data.users = users;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {
        }
      });
    }
  });

  //------------------------------------------------------------------------------------------------------------------------------------------------
  // Сроки сдачи
  //------------------------------------------------------------------------------------------------------------------------------------------------
  var TermsView = Backbone.View.extend({
    dirtype: 19,
    el: $('#terms'),
    events: {
      'click .btn-terms-save': 'onSave'
    },
    initialize: function () {
      this.$('input').numeric({
        decimal: false,
        negative: false
      });
      this.data_id = $(".terms_id").val();
    },
    onSave: function () {
      var data = new Object();
      data['one_floor_building'] = this.$(".one-floor-building").val() ? parseInt(this.$(".one-floor-building").val()) : '';
      data['two_floor_building'] = this.$(".two-floor-building").val() ? parseInt(this.$(".two-floor-building").val()) : '';
      data['three_floor_building'] = this.$(".three-floor-building").val() ? parseInt(this.$(".three-floor-building").val()) : '';
      data['type'] = this.dirtype;
      data['name'] = 'Сроки';
      if (this.data_id) {
        data['id'] = this.data_id;
        $.ajax({
          url: '/handlers/upddirid',
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: $.toJSON(data),
          timeout: 35000,
          error: function (jqXHR, textStatus, errorThrown) {
            $.jGrowl('Ошибка сохранения.', {
              'themeState': 'growl-error',
              'sticky': false,
              life: 5000
            });
          },
          success: function (result, textStatus, jqXHR) {
            this.data_id = result['id'];
            $.jGrowl('Данные успешно сохранены.', {
              'themeState': 'growl-success',
              'sticky': false,
              life: 5000
            });
          }
        });
      } else {
        $.ajax({
          url: '/handlers/dir',
          type: 'POST',
          dataType: 'json',
          contentType: "application/json; charset=utf-8",
          data: $.toJSON(data),
          timeout: 35000,
          error: function (jqXHR, textStatus, errorThrown) {
            $.jGrowl('Ошибка сохранения.', {
              'themeState': 'growl-error',
              'sticky': false,
              life: 5000
            });
          },
          success: function (result, textStatus, jqXHR) {
            this.data_id = result['id'];
            $.jGrowl('Данные успешно сохранены.', {
              'themeState': 'growl-success',
              'sticky': false,
              life: 5000
            });
          }
        });
      }
    }
  });

  //
  // Табель учета рабочего времени------------------------------------------------------------------
  //
  var TimeSheetView = Backbone.View.extend({
    dirtype: 20,
    el: $('#time_sheet'),
    events: {
      'change .is-enabled': 'changeEnable',
      'click .add-new': 'addNew'
    },
    initialize: function () {
      var self = this;
      this.$('.editable').editable({
        'mode': 'inline',
        'rows': 3,
        params: function (params) {
          params.dirtype = self.dirtype;
          return params;
        }
      }).on('save', function (e, params) {

        $(this).editable('option', 'pk', params.newValue);
      });
    },
    changeEnable: function (el) {
      var ch = $(el.target);
      var data = new Object();
      var id = ch.data('id');
      // if (ch.is('.event-need')){
      //     data.need_event = ch.is(':checked');
      // }
      // else{
       data.stat = ch.is(':checked') ? 'enabled' : 'disabled';
      //}
      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir/' + id,
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {
          //alert('error');
        },
        success: function (result, textStatus, jqXHR) {
          var par = ch.parents('tr')[0];
          $(par).removeClass().addClass(data.stat);
        }
      });
    },
    addNew: function () {
      var name = this.$('.new-dir-name').val();
      var note = this.$('.new-dir-note').val();
      if (name == '' || note == '')
        return;
      var self = this;
      var data = new Object();
      data.name = name;
      data.note = note;
      data.stat = 'enabled';
      data.need_event = false;
      data.code = 9999;

      data.type = this.dirtype;
      $.ajax({
        url: '/handlers/dir',
        type: 'POST',
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        data: $.toJSON(data),
        timeout: 35000,
        error: function (jqXHR, textStatus, errorThrown) {

        },
        success: function (result, textStatus, jqXHR) {
          var tmpl = _.template($('#orderPositionTemplate').html());
          var cnt = self.$('table tr').length;
          result.cnt = cnt;
          dr = new DirModel(result);

          self.$('table tbody').append(tmpl(dr.toJSON()));
          self.$('.editable').editable({
            'mode': 'inline',
            'rows': 3,
            params: function (params) {
              params.dirtype = self.dirtype;
              return params;
            }
          }).on('save', function (e, params) {
            $(this).editable('option', 'pk', params.newValue);
          });
          self.$('.new-dir-name').val('');
          self.$('.new-dir-note').val('');
        }
      });

    }
  });

  ///-------------------------------------------------------------------------------------------------------
  /// Базовое представление
  ///-------------------------------------------------------------------------------------------------------
  var app = new AppView();
});
