/**
 * форма добавления контакта клиента
*/

var contactFormTemplate = require('../templates/contact_form_template.html');
var contactEmailTemplate = require('../templates/contact_email_template.html');
var contactPhoneTemplate = require('../templates/contact_phone_template.html');
var clientDDTemplate = require('../templates/client_dd_template.html');

var ContactFormView = Backbone.View.extend({
	client: null,
	check_client_by_email: null,
	check_client_by_phone: null,
	find_blink: null,
	events: {
		'click .new-phone': 'addPhone',
		'click .new-email': 'addEmail',
		'click .delete-email': 'deleteEmail',
		'click .delete-phone': 'deletePhone',
		'click .save-contact': 'saveContact',
		'click .close-contact': 'resetContact',
		/*'keyup .client-email': 'checkClientByEmail',*/
		'keyup .client-phone': 'checkClientByPhone',
		/*
		'click .search-same-email':'getClientByEmail',
		'click .search-same-phone':'getClientByPhone'
		*/
	},
	initialize:function(){
		this.template = contactFormTemplate;
		this.client = this.options.client;
		//this.check_client_by_email = _.debounce(_.bind(this.getClientByEmail, this), 2000);
		//this.check_client_by_phone = _.debounce(_.bind(this.getClientByPhone, this), 2000);
		//this.check_client_by_email = _.bind(this.getClientByPhone, this);
		//this.check_client_by_phone = _.bind(this.getClientByPhone, this);
	},
	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
		var self = this;
		if (this.model.get('email').length > 0){
			this.$('#client-email').val(this.model.get('email')[0]);
		}
		if (this.model.get('phone').length > 0){
			var item = this.model.get('phone')[0];
			var checked = false;
			if (item.indexOf('м.')!= -1){
				item = item.slice(3);
				checked=true;
			}
			this.$('#client-phone').val(item);
			this.$('#ismobile').prop('checked',checked);

		}
		if (this.model.get('email').length > 1){
			var foo = 0;
			_.each(this.model.get('email'), function(item){
				if (foo>0){
					var ln =  contactEmailTemplate;
					self.$('.client-emails').append(ln({'email':item}));
				}
				foo++;
			});
		}
		if (this.model.get('phone').length > 1){
			var foo = 0;
			_.each(this.model.get('phone'), function(item){
				if (foo>0){
					var ln =  contactPhoneTemplate;
					var checked = '';
					if (item.indexOf('м.')!= -1){
						checked = 'checked';
						item = item.slice(3);
					}
					self.$('.client-phones').append(ln({'phone':item, 'checked':checked}));
				}
				foo++;
			});
		}
		this.$("#client-fired").datepicker({weekStart:1,format:'dd.mm.yyyy'});
		if(this.model.get("fired_date"))
			this.$("#client-fired").datepicker("setValue",Routine.parseDate(this.model.get("fired_date"),"dd.mm.yyyy"));
		this.$("#client-post").val(this.model.get('post'));
		this.$("#client-note").val(this.model.get('note'));
		//////////////////////////////////

		//////////////////////////////////

		this.find_blink = _.debounce( function($input){
			var $par = $input.closest('div.input-append');
			var $search_btn = $('.search-same-btn', $par);
			$search_btn.addClass('blink');
			setTimeout(function(){$search_btn.removeClass('blink');},300);
		},300);

		this.check_client_by_email = _.debounce(function($input){
		   this.getClientsByEmail_new($input, true);
		}.bind(this), 2000);

		this.check_client_by_phone = _.debounce(function($input){
		   this.getClientsByPhone_new($input, true);
		}.bind(this), 2000);

		this.$('.client-email').on('keyup', function(e){
			var $input = $(e.target);
			this.find_blink($input);
			this.check_client_by_email($input);
		}.bind(this));

		this.$('.search-same-email').on('click', function(e){
			var $par = $(e.target).closest('div.input-append');
			var $input = $('input', $par);
			this.find_blink($input);
			this.getClientsByEmail_new($input, false);
		}.bind(this));

		this.$('.client-phone').on('keyup', function(e){
			var $input = $(e.target);
			this.find_blink($input);
			this.check_client_by_phone($input);
		}.bind(this));

		this.$('.search-same-phone').on('click', function(e){
			var $par = $(e.target).closest('div.input-append');
			var $input = $('input.client-phone', $par);
			this.find_blink($input);
			this.getClientsByPhone_new($input, false);
		}.bind(this));

		var $sel = this.$('#info-source').selectize({
//                        options: contacts,
					valueField: 'value',
					labelField: 'label',
					create: false,
					render: {
//                            item: function(item, escape) {
//                                return "<div>" +
//                                    (item.name ? '<span class="name">' + escape(item.name) + '</span>' : '')+
//                                '</div>';
//                            },
				option: function(item, escape) {
					var result = '<div data-value="' + escape(item.value) + '" data-selectable="" class="option"><b>' + escape(item.label);
					result += '</b><br><small class="select-item-note"><i>'+'Тут описание'+'</i></small>';
					result += '</div>';
//                                var result = '<div>' +
//                                             '<b class="select-item-title">' + escape(item) + '</b><br>';
//                                result += '<small class="select-item-note"><i>'+'Тут описание'+'</i></small>';
//                                result += '</div>';
							return result
						}
					}
				});
		this.$('.selectize-control').width(180);
		this.$('.selectize-input').css('text-align', 'center').css('padding-left', '0').css('padding-right', '14px');
		//console.log(this.model.toJSON());
		//console.log(this.model.get('info_source'));
		this.$('#info-source')[0].selectize.setValue(this.model.get('info_source'));

		return this;
	},

	getClientsByPhone_new: function($input, auto){
		var value = $input.val();
		var self = this;
		if (value.match(/\d/g).length < 6) return;

		var par = $input.closest('div.input-append');

		var self = this;
		//$('.check_link',par).remove();
		//$('.search-same-btn',par).show().addClass('blink');
//            if(this.phone_checker){
//                this.phone_checker.abort();
//            }
		$.get("/handlers/clientfind_phone/?q=" + encodeURIComponent(value)).done(function(data){
			if (data.result.length > 0){
				var result2 = data.result.filter(function(item){ return !self.client || item.id !== self.client.get('id')});
				if (result2.length > 0)
				{
					$('.check_link', par).remove();
					par.append(clientDDTemplate({'clients':result2}));
					$('.search-same-btn',par).hide();
					result2.map(function(item){
							$.get('/handlers/clientorders/', {id:item.id})
							.done(function(data){
							$('#cnt-'+item.id, par).text(data.cnt);
						});
					});
				}else{
					$('.check_link', par).remove();
					$('.search-same-btn',par).show();
				   if(!auto)
					$.jGrowl("Совпадений не найдено", { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
				}
			}else{
					$('.check_link', par).remove();
					$('.search-same-btn',par).show();
				   if(!auto)
					$.jGrowl("Совпадений не найдено", { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
				}
		});
	},

	getClientsByEmail_new:function($input, auto){

		var value = $input.val();
		var self = this;
		if (value.length < 5 && value.indexOf('@')<1) return;
		var par = $input.closest('div.input-append');
		 $.get("/handlers/clientfind_email/?q=" + encodeURIComponent(value)).done(function(data){
			if (data.result.length > 0){
				var result2 = data.result.filter(function(item){ return !self.client|| item.id !== self.client.get('id')});
				if (result2.length > 0){
						$('.check_link', par).remove();
						par.append(clientDDTemplate({'clients':result2}));
						$('.search-same-btn',par).hide();
						result2.map(function(item){
							$.get('/handlers/clientorders/', {id:item.id})
							.done(function(data){
							$('#cnt-'+item.id, par).text(data.cnt);
						});
					});
				}else{
					$('.check_link', par).remove();
					$('.search-same-btn',par).show();
				   if(!auto)
					$.jGrowl("Совпадений не найдено", { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
				}
			}else{
					$('.check_link', par).remove();
					$('.search-same-btn',par).show();
				   if(!auto)
					$.jGrowl("Совпадений не найдено", { 'themeState':'growl-error', 'sticky':false, life: 5000, 'position': 'bottom-right' });
				}
		});

	},
	addEmail: function(){
		var ln =  contactEmailTemplate;
		this.$('.client-emails').append(ln({'email':''}));
		this.$('.client-email', ln.$el).on('keyup', function(e){
			var $input = $(e.target);
			this.find_blink($input);
			this.check_client_by_email($input);
		}.bind(this));
		this.$('.search-same-email', ln.$el).on('click', function(e){
			var $par = $(e.target).closest('div.input-append');
			var $input = $('input', $par);
			this.find_blink($input);
			this.getClientsByEmail_new($input, false);
		}.bind(this));
	},
	deleteEmail: function(el){
		$($(el.target).parents('.email-row')[0]).remove();
	},
	addPhone: function(){
		var ln =  contactPhoneTemplate;

		this.$('.client-phones').append(ln({'phone':'', 'checked':''}));

		this.$('.client-phone', ln.$el).on('keyup', function(e){
			var $input = $(e.target);
			this.find_blink($input);
			this.check_client_by_phone($input);
		}.bind(this));

		this.$('.search-same-phone', ln.$el).on('click', function(e){
			var $par = $(e.target).closest('div.input-append');
			var $input = $('input.client-phone', $par);
			this.find_blink($input);
			this.getClientsByPhone_new($input, false);
		}.bind(this));


	},
	deletePhone: function(el){
		$($(el.target).parents('.phone-row')[0]).remove();
	},
	resetContact: function(){
		var self = this;
		this.trigger("closefrm");
		this.$el.parents(".contact-form:first").slideUp(400,function(){
			self.$el.hide().empty();
		});
		this.undelegateEvents();
		$(this.el).removeData().unbind();
	},
	saveContact: function(){
		var info_source = this.$('#info-source')[0].selectize.getValue();
		var fio = this.$('#client-fio').val();
		if (fio == ''){
			showmsg('Введите ФИО.');
			return;
		}
		var emails = [];
		var iemail = false;
		this.$('input.client-email').each(function(){
			var eml = $(this).val();
			if (eml != ''){
				if (eml.indexOf('@') == -1){
					iemail = true;
				}
				else{
					emails.push(eml);
				}
			}
		});
		if (iemail){
			showmsg('Введите правильный эл. адрес.');
			return;
		}
		this.model.set('fio', fio);
		this.model.set('email', emails);
		this.model.set('info_source', info_source);
		var phones = [];
		this.$('div.phone-row').each(function(){
			var ph = $('input.client-phone', $(this)).val();
			if ($('input.ismobile', $(this)).is(':checked'))
				ph = 'м. '+ph;
			if (ph != '')
				phones.push(ph);
		});
		this.model.set('phone', phones);

		this.model.set('post',this.$("#client-post").val());
		this.model.set('note',this.$("#client-note").val());
		this.model.set('fired_date',this.$("#client-fired").val());
		// TODO: Check that no more dependencies than refresh
		// this.options.client.save();
	}
});

module.exports = ContactFormView;
