var preloader = {
	Show:function(){
		 $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
	},
	Hide:function(){
		$.unblockUI();
	}
}

$(function(){
	var User = Backbone.Model.extend({
		defaults:{
			"admin_bl":false,
			"stat_bl":false,
			"fio":"",
			"table":"",
			"email":"",
			"defaultpage":"",
			"id":"",
			"admin":"manager",
			"stat":"enabled",
			"inner_phone": ''
		},
		initialize: function() {
			this.bind('request', preloader.Show, this);
			this.bind('sync', preloader.Hide, this);
			this.on('change:admin',this.onAdminChange);
			this.on('change:stat',this.onStatChange);
			this.onAdminChange();
			this.onStatChange();

			this.on('change:admin_bl',this.onCheckChanged);
			this.on('change:stat_bl',this.onCheckChanged);
		},
		onAdminChange:function(){
			this.set("admin_bl",this.get("admin")=="admin");
		},
		onStatChange:function(){
			this.set("stat_bl",this.get("stat")!="enabled");
		},
		onCheckChanged:function(){
			//this.set("admin",this.get("admin_bl")?"admin":"manager");
			//this.set("stat",this.get("stat_bl")?"disabled":"enabled");
			if(this.get("id")){
				var data = {"admin":this.get("admin_bl")?"admin":"manager", "stat":this.get("stat_bl")?"disabled":"enabled"}
				$.ajax({
							url: '/handlers/user_save/'+this.get("id"),
							type: 'POST',
							dataType: 'json',
							contentType: "application/json; charset=utf-8",
							data: $.toJSON(data),
							timeout: 35000,
							error: function (jqXHR, textStatus, errorThrown) {
								showmsg("Ошибка сервера");
							},
							success: function (result, textStatus, jqXHR) {
							}
						});
			}
		}
	});

	var Users = Backbone.Collection.extend({
		model: User,
		url: "/handlers/user",
		initialize: function() {
			this.bind('request', preloader.Show, this);
			this.bind('sync', preloader.Hide, this);
		}
	});

	// роли
	var Role = Backbone.Model.extend({
		defaults:{
			access:false
		}
	});

	var Roles = Backbone.Collection.extend({
		model: Role
	});

	// столбцы, отображаемые для списка страниц
	var roles_columns = [{name:'access',label:'', cell:BooleanCellEx, headerCell:BooleanHeaderEx},
	{name:'title',label:'Название', cell:'string',editable:false,}
	];

	// редактирование роли
	var EditUser= Backbone.View.extend({
			template:  _.template($('#userEditTemplate').html()),
			roles:null,
			initialize: function() {
				var self = this;
					if(this.model.get("id")){
						this.model.fetch().complete(function(){
							self.render();
						});
					}else
						this.render();
			},

			events:{
			 "click .save-role":"onSave",
			 "click .close-role":"onCancel"
			},

			render: function() {
					var html = this.template( this.model.toJSON() );
					this.$el.html(html);
					this.roles = new Users(global_role_list);
					var self = this;
					// заполняем доступность у юзеров
					_.each(this.model.get("roles"),function(el){
						var rl = self.roles.get(el);
						if(rl)
							rl.set("access",true);
					});
					 // добавляю грид с пользователями
					var grid = new Backgrid.Grid({
						columns: roles_columns,
						collection: this.roles
					});
					this.$el.find(".roles-list").append(grid.render().el);
					return this;
			},
			onCancel:function(){
				route.navigate("",true);
			},
			checkField:function(value){
				if(value)
					return true;
				return false;
			},
			onSave:function(){
				// значения
				var fio = $("#user-fio").val();
				var table = $("#user-table").val();
				var default_page = $("#user-default-page").val();
				var email= $("#user-email").val();
				var inner_phone= $("#user-inner-phone").val();
				var psw = $("#user-password").val();
				var psw2 = $("#user-repassword").val();
				var admin = $("#user-isadmin").is(":checked")?"admin":"manager";
				var stat = $("#user-isblock").is(":checked")?"disabled":"enabled";
				// роли
				var roles = [];
				this.roles.each(function(el){
					if(el.get("access"))
						roles.push(el.get("id"));
				})
				// проверяем заполненность полей
				if(!fio) {showmsg('Укажите Фамилию Имя Отчество');return;}
				if(!default_page) {showmsg('Укажите страницу по умолчанию');return;}
				if(!email) {showmsg('Укажите email');return;}
				if(psw!=psw2) {showmsg('Пароли не совпадают');return;}
				if(!(/(.+)@(.+){2,}\.(.+){2,}/.test(email))){showmsg('Неверный формат email');return;}
				this.model.set("fio",fio);
				this.model.set("table",table);
				this.model.set("defaultpage",default_page);
				this.model.set("email",email);
				this.model.set("inner_phone",inner_phone);
				this.model.set("password",psw);
				this.model.set("admin",admin);
				this.model.set("stat",stat);
				this.model.set("roles",roles);
				if(!this.model.get("id"))
					users.add(this.model);
				this.model.save().complete(function(){
					route.navigate("",true);
				});
			}
	});


	// строка в гриде роли
	var EditUserStringCell = Backgrid.StringCell.extend({
		events:{
				'click':"onUserClick"
			},
			onUserClick:function(){
				route.navigate("edit/"+this.model.get("id"),true);
			}
		})


	// столбцы, отображаемые для списка пользователей
	var user_colums = [{name:'fio',label:"ФИО", editable:false,cell: EditUserStringCell},
		{name:'email', label: 'Email', editable:false,cell: EditUserStringCell},
		{name:'table', label: 'Табельный номер', editable:false,cell: EditUserStringCell},
		{name:'admin_bl',label:'Супер-админ.', cell:BooleanCellEx},
		{name:'stat_bl',label:'Заблокирован', cell:BooleanCellEx},
	];
	var users = new Users();




	var AppView = Backbone.View.extend({
			initialize:function(){

				var grid = new Backgrid.Grid({
				columns: user_colums,
				collection: users
			});

			// добавить поиск
			var filter = new Backgrid.Extension.ClientSideFilter({
				collection: users,
				fields: ['fio','email','table']
			});

			$("#user-list .rl-left").append(filter.render().el);

			// Render the grid and attach the Grid's root to your HTML document
			$("#user-list").append(grid.render().el);

			$("#newUser").click(function(){route.navigate("add",true);});

			},
			EditUser:function(id){
				var user = users.get(id);
				if(user){
					var editContactView = new EditUser({ model: user });
					$("#user-edit").html("").append(editContactView.el).show();
					$("#user-list").hide();
				}else
					showmsg("Пользователя не существует.")
			}
	});


	var app = new AppView();

	// настраивам роуты
	var AppRouter = Backbone.Router.extend({

		routes: {
			"":               "index",
			"add":            "add",    // добавить роль
			"edit/:id":        "edit"  // редактировать запись
		},

		index:function(){
			if(users.length==0)
				users.fetch({reset: true});
			$("#user-list").show();
			$("#user-edit").hide();
			//$("#role-edit").hide();
		},

		add: function() {
			var editView = new EditUser({model:new User()});
			$("#user-edit").html("").append(editView.el).show();
			$("#user-list").hide();
			/*var editContactView = new EditRole({ model: new Role()});
			$("#role-edit").html("").append(editContactView.el).show();
			$("#roles-grid").hide(); */
		},

		edit: function(id) {
			if(users.length==0){
				users.fetch({reset: true}).complete(function(){
					app.EditUser(id);
				});
			}else
				app.EditUser(id);
		}

	});

	var route = new AppRouter();
	Backbone.history.start();

});
