//$(function(){
var TreeDataModel = Backbone.Model.extend({
	idAttribute: "_id",
	 defaults: {
	 	routine: 0,
	 	note: ''
	 },
	url:function(){
		return "/handlers/esuddata/element"+(this.get("_id")?("/"+this.get("_id")):"");
	}
});

var TreeDataCollection = Backbone.Collection.extend({
	model:TreeDataModel,
	url:"/handlers/esuddata/getlist"
});

var TreeView = Backbone.View.extend({
	template:_.template($("#tmplTreeView").html()),
	row_template:_.template($("#tmplTreeElem").html()),
	contextMenu: null,
	state:'collapsed',
	main_tree:null,
	initialize:function(){
		var searchTimeOut = null;
		Backbone.on('highLightActiveItem', this.onHighLightActiveItem, this);
		Backbone.on('unHighLightActiveItem', this.onUnHighLightActiveItem, this);

		this.render();
		this.main_tree = this.$el.find("table.treetable");
		this.model.on("reset",this.render,this);
		var self = this;
		 $("#navigationButtons .btn-collapse-all").click(function(){
			$("#navigationButtons .btn-collapse-all").css('cursor', 'wait');
			setTimeout( function(){
				if($("#treedata-view table.treetable.searchresult").length>0)
					$("#treedata-view table.treetable.searchresult").treetable('collapseAll');
				else
					$("#treedata-view table.treetable").treetable('collapseAll');
				self.state = 'collapsed';
				$("#navigationButtons .btn-collapse-all").css('cursor', 'default');
			}, 100);
		});
		$("#navigationButtons .btn-expand-all").click(function(){
			$("#navigationButtons .btn-expand-all").css('cursor', 'wait');
			setTimeout( function(){
				if($("#treedata-view table.treetable.searchresult").length>0)
					$("#treedata-view table.treetable.searchresult").treetable('expandAll');
				else
					$("#treedata-view table.treetable").treetable('expandAll');
				self.state = 'expanded';
				$("#navigationButtons .btn-expand-all").css('cursor', 'default');
			}, 100);
		});
		$("#navigationButtons .btn-add-node").click(function(){
			self.addRootNode();
		});
		$("#navigationButtons .tb-search").keydown(function(e){
			//if(e.keyCode==13)
			if(e.keyCode==8 && $(this).val()=="") return;
			$("#navigationButtons .tb-search").one('keyup', function() {
				$("#navigationButtons .tb-search").css('cursor', 'wait');
				if(searchTimeOut)
				{
					clearTimeout(searchTimeOut);
					searchTimeOut = null;
				}
				searchTimeOut = setTimeout( function(){
					console.log('1111');
					self.filterData($("#navigationButtons .tb-search").val());
					$("#navigationButtons .tb-search").css('cursor', 'default');
				}, 600);
			});
		});
		$(document).on("click",function(){
			self.$el.find(".highlight").removeClass("highlight");
		});
	},
	events:{
		'click .add-btn':'onAddElementClick',
		'click .remove-btn':'onRemoveElementClick',
		'click .edit-btn':'onEditElementClick',
		'click .link-btn':'onLinkClick',
		'click .cancel-link-btn':'onLinkCancel',
		'click .set-link-btn':'onSetLink',
		'click td.name span.elem-name, td.name span.indenter':"onElemClick",
		'click .link-name':'onGoToLink',
		'node:expand':'onNodeExpand'
	},
	onElemClick:function(e){
		var self = this;
		self.$el.find(".highlight").removeClass("highlight");
		setTimeout(function(){
			$(e.currentTarget).parents("tr:first").addClass("highlight");
		},100);

	},
	onHighLightActiveItem: function(e)
	{
		e[0].addClass("highlight");
	},
	onUnHighLightActiveItem: function(e)
	{
		e[0].removeClass("highlight");
	},

	renderContextMenu: function(menu, to_show)
	{
		menu.find("li").hide();
		for(var i in  to_show)
			menu.find("." + to_show[i]).show();
	},
	render:function(){
		var self = this;
		// заполняем полные id-шники папок и элементов
		//this.model.sort();
		this.$el.html("").append(this.template(this.model.toJSON()));
		this.table = this.$el.find("table.treetable").treetable({ expandable: true, onNodeExpand: function(e){ self.$el.trigger("node:expand",[this]); } });
		self.$("table.treetable").removeClass('move-cursor');


		/*#61 отменяем временно
		  // контекстное меню
		 this.contextMenu = this.$el.find("table.treetable").contextmenu({
			target: '#itemContextMenu',
			scopes: 'tbody > tr',
			state: 'default',
			close: function (e) {
				self.$el.find(".highlight1").removeClass('highlight1');
			},
			before: function (e) {
				e.preventDefault();
				// если элемент является ссылкой, то для него есть только кнопка удаления
				var tr = $(e.target).parents('tr:first');
				var curItem = self.model.get(tr.data('tt-id'));
				var cur_state = this.getMenu().data('state');
				//console.log(cur_state);

				self.$el.find(".highlight1").removeClass('highlight1');
				$(tr).addClass('highlight1');

				// если вызов контектсного меню идет для ярлыка
				if( curItem.has('datalink') && curItem.get('datalink'))
				{
					if(this.getMenu().data('state')=='default')
						self.renderContextMenu(this.getMenu(), ['cancel','remove','divider'])
					else
					{
						var operations = ['cancel' + ((cur_state)?'-'+cur_state:'')];
						if(cur_state && cur_state!='default')
						{
							operations.push('accept' + ((cur_state)?'-'+cur_state:''));
							operations.push('divider');
						}
						self.renderContextMenu(this.getMenu(), operations )
					}
				}
				else
				{
					var pRow = self.$el.find(".insert-row");
					switch(this.getMenu().data('state'))
					{
						case 'link':
							if(pRow.length>0 && pRow.data('tt-id')==tr.data('tt-id'))
								self.renderContextMenu(this.getMenu(), ['cancel-link'])
							else
								self.renderContextMenu(this.getMenu(), App.CMOperations[curItem.get('type')]['link']);
						break;
						case 'move':
							if(pRow.length>0 && pRow.data('tt-id')==tr.data('tt-id'))
								self.renderContextMenu(this.getMenu(), ['cancel-move'])
							else
								self.renderContextMenu(this.getMenu(), App.CMOperations[curItem.get('type')]['move']);
						break;
						default:
							//if(pRow.length>0 && pRow.data('tt-id')==tr.data('tt-id'))
							//	self.renderContextMenu(this.getMenu(), ['cancel'])
							//else
							self.renderContextMenu(this.getMenu(), App.CMOperations[curItem.get('type')]['default']);
						break;
					}
				}
				return true;
			 },
			onItem: function (context, e) {
				switch($(e.target).data('val'))
				{
					case "add":
						Backbone.trigger('highLightActiveItem',[context]);
						self.onAddElementClick(context);
						//context.addClass("highlight");
					break;
					case "edit":
						Backbone.trigger('highLightActiveItem',[context]);
						self.onEditElementClick(context);
					break;
					case "copy":
						self.onCopyElementClick(context);
					break;
					case "remove":
						var msg = "Вы уверены, что хотите удалить элемент?";
						bootbox.confirm(msg, function(result)
						{
							if(result)
								self.onRemoveElementClick(context);

							self.$el.find(".highlight1").removeClass('highlight1');
						});
					break;
					case "link":
						Backbone.trigger('highLightActiveItem',[context]);
						self.$(".treetable").addClass('move-cursor');
						this.state = 'link';
						this.getMenu().data('state','link');
						self.onLinkClick(context);
					break;
					case "cancel-link":
						Backbone.trigger('unHighLightActiveItem',[self.$el.find(".insert-row")]);
						self.$el.find(".highlight1").removeClass('highlight1');
						self.$("table.treetable").removeClass('move-cursor');
						this.state = 'default';
						this.getMenu().data('state','default');
						self.onLinkCancelM(context);
						self.$el.find(".insert-row").removeClass("insert-row");
					break;
					case "accept-link":
						Backbone.trigger('unHighLightActiveItem',[self.$el.find(".insert-row")]);
						self.$el.find(".highlight1").removeClass('highlight1');
						self.$("table.treetable").removeClass('move-cursor');
						this.state = 'default';
						this.getMenu().data('state','default');
						self.onSetLinkM(context);
					break;
					case "move":
						Backbone.trigger('highLightActiveItem',[context]);
						self.$("table.treetable").addClass('move-cursor');
						this.state = 'move';
						this.getMenu().data('state','move');
						self.onMoveClick(context);
					break;
					case "cancel-move":
						Backbone.trigger('unHighLightActiveItem',[self.$el.find(".insert-row")]);
						self.$el.find(".highlight1").removeClass('highlight1');
						self.$("table.treetable").removeClass('move-cursor');
						this.state = 'default';
						this.getMenu().data('state','default');
						self.onMoveCancelM(context);
						self.$el.find(".insert-row").removeClass("insert-row");
					break;
					case "accept-move":
						Backbone.trigger('unHighLightActiveItem',[self.$el.find(".insert-row")]);
						self.$el.find(".highlight1").removeClass('highlight1');
						self.$("table.treetable").removeClass('move-cursor');
						this.state = 'default';
						this.getMenu().data('state','default');
						self.onSetMoveM(context);
					break;
					case "cancel":
						self.$("table.treetable").removeClass('move-cursor');
						this.state = 'default';
						this.getMenu().data('state','default');
						Backbone.trigger('unHighLightActiveItem',[self.$el.find(".insert-row")]);
						self.$el.find(".highlight1").removeClass('highlight1');
						self.$el.find(".insert-row").removeClass("insert-row");
					break;
				}
			  //console.log(context.html());
			  //alert($(e.target).text());
			  //table.row('.selected').remove().draw( false );
			}
		  });
		*/
		var items = null;
		/*#61 отменяем временно

		this.$el.find("tr").draggable({
			helper: "clone",
			opacity: .75,
			refreshPositions: true,
			revert: "invalid",
			revertDuration: 300,
			scroll: true,
			start: function( event, ui ) {
				items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$($(ui.helper).context).data('tt-parent-id')+'"]');
				self.onStartDrag(event,ui, items);
			},
			stop: function( event, ui )
			{
				self.onEndDrag(event,ui, items);
			}
		}); */

		this.delegateEvents();
	},
	onNodeExpand:function(e,a){
		App.Route.navigate("/"+a.id,false);
	},
	onEndDrag:function(event, ui, items)
	{
		//console.log('destroed');
		items.droppable( "destroy" );
	},

	onStartDrag:function(event, ui, items)
	{
		var self = this;
		var parent_id = $($(ui.helper).context).data('tt-parent-id');
		if(parent_id)
		{
			//console.log(self.$("tr[data-tt-parent-id='53c5315b63ccd81820dc7b44']").length);
			//var items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$(ui.helper).data('tt-parent-id')+'"]');
			items.droppable({
				disabled: false,
				hoverClass: "accept",
				over: function(e, ui) {
				},
				drop:function(e, ui)
				{
					if($(ui.draggable).data('tt-id')!=$(e.target).data('tt-id'))
					{
						// тот кого перемещаем
						var cur_item = self.model.get($(ui.helper).data('tt-id'));
						// тот перед кем вставляем
						var before_item = self.model.get($(e.target).data('tt-id'));
						// поиск в коллекции всех у кого parent_id = текущему
						var data_items = self.model.where({parent_id: parent_id});

						// сортировка по Routine
						data_items.sort(function(a, b) {return a.get('routine') - b.get('routine')})



						var new_data_items = [];
						var index = 0;

						for(var i in data_items)
						{
							if(data_items[i].get('_id')==cur_item.get('_id'))
								continue;
							if(data_items[i].get('_id')==before_item.get('_id'))
							{
								cur_item.set('routine',index);
								new_data_items.push(cur_item);
								index++;
							}

							data_items[i].set('routine',index);
							new_data_items.push(data_items[i]);
							index++;
						}

						var el_id = $(ui.draggable).data("tt-id");
						var child_list = [];
						// собираем всех потомком
						self.model.forEach(function(el){
							if(el.get("path").indexOf(el_id)>=0)
								child_list.push(el.get("_id"));
						});
						var pr = $(ui.draggable);
						var child_rows = [];
						// получаем список <tr> потомков
						while(child_list.indexOf(pr.next().data("tt-id"))>=0){
							pr = pr.next();
							child_rows.push(pr);
						}

						$(e.target).before($(ui.draggable));
						for(var r in child_rows)
							$(ui.draggable).after(child_rows[r]);


						//for(var i in new_data_items)
						//	console.log(new_data_items[i].get('name') + '(' + new_data_items[i].get('routine')+')');


						// сохранить данные
						$.ajax({
							type: "PUT",
							url: "/handlers/esuddata/updateposition",
							data: JSON.stringify(new_data_items),
							timeout: 55000,
							contentType: 'application/json',
							dataType: 'json',
							async:true
							}).done(function(result) {
								console.log(JSON.stringify(result));
						});
					}

				},
				cancel: function(e, ui)
				{
					//items.droppable("option", "disabled", true );
					//items.droppable("destroy");
				}
			});
		}

	},
	getFullParentId:function(elem,list){
		if(elem && elem.get("parent_id")){
			var pr = this.getFullParentId(list.get(elem.get("parent_id")),list);
			if(pr!="")
				return pr+"-"+elem.get("parent_id");
			return elem.get("parent_id");
		}
		return "";
	},
	addRootNode:function(){
		var self = this;
		var dlg = new EditElementDlg({'parent_type':''});
		dlg.on("dialogsave",function(){
			var parent = null;
			var routine_index = self.getMaxRoutine(null)+1;
			var elem = new TreeDataModel({name:dlg.$el.find(".name").val(),type:dlg.$el.find(".type").val(),parent_id:null,"path":"",note:dlg.$el.find(".note").val(), routine:routine_index});
			$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});

			elem.save(elem.toJSON(),{'success':function(){
				$.unblockUI();
				self.model.add(elem);
				self.$el.find("table.treetable").treetable('loadBranch',null,self.row_template(elem.toJSON()).replace(/^\s+|\s+$/g, ''));
				self.delegateEvents();
			},error:function(){
				$.unblockUI();
				showmsg("Ошибка сервера");
			}});
		},this);
	},

	/**
	* Получение минимального routine внутри ветки
	**/
	getMinRoutine: function(parent_id)
	{
		var data_items = this.model.where({parent_id: parent_id});
		var min_val = 0;
		for(var i in data_items)
			if(data_items[i].get('routine')<min_val)
				min_val = data_items[i].get('routine');
		return min_val;
	},
	/**
	* Получение максимального routine внутри ветки
	**/
	getMaxRoutine: function(parent_id)
	{
		var data_items = this.model.where({parent_id: parent_id});
		var max_val = 0;
		for(var i in data_items)
			if(data_items[i].get('routine')>max_val)
				max_val = data_items[i].get('routine');
		return max_val;
	},

	onAddElementClick:function(currentTarget){
		var self = this;
		var row = $(currentTarget);
		var dlg = new EditElementDlg({'parent_type': self.model.get(row.data('tt-id')).get('type')});
		dlg.on("dialogclose",function(){
			Backbone.trigger('unHighLightActiveItem',[row]);
			self.$el.find(".highlight1").removeClass('highlight1');
		},self);

		dlg.on("dialogsave",function(){
			var parent = self.model.get(row.data('tt-id'));
			var routine_index = self.getMinRoutine(parent.get('_id'))-1;

			var elem = new TreeDataModel({name:dlg.$el.find(".name").val(),type:dlg.$el.find(".type").val(),parent_id:parent.get("_id"),"path":(parent.get("path")?(parent.get("path")+"-"):"")+parent.get("_id"), "routine": routine_index, note:dlg.$el.find(".note").val()});
			$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
			elem.save(elem.toJSON(),{'success':function(){
				$.unblockUI();
				self.model.add(elem);
				self.$el.find("table.treetable").treetable('loadBranch',self.$el.find("table.treetable").treetable('node',row.data('tt-id')),self.row_template(elem.toJSON()).replace(/^\s+|\s+$/g, ''));

				var items = null;
				self.$("table.treetable").find('tr[data-tt-id="'+elem.get('_id')+'"]').draggable({
					helper: "clone",
					opacity: .75,
					refreshPositions: true,
					revert: "invalid",
					revertDuration: 300,
					scroll: true,
					start: function( event, ui ) {
						items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$($(ui.helper).context).data('tt-parent-id')+'"]');
						self.onStartDrag(event,ui, items);
					},
					stop: function( event, ui )
					{
						self.onEndDrag(event,ui, items);
					}
				});

				self.delegateEvents();
			},error:function(){
				$.unblockUI();
				showmsg("Ошибка сервера");
			}});
		},self);
	},
	onRemoveElementClick:function(currentTarget){
		var self = this;
		var row = $(currentTarget);
		var elem = self.model.get(row.data('tt-id'));
		$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
		elem.destroy({'success':function(){
			$.unblockUI();
			self.model.remove(elem);
			self.$el.find("table.treetable").treetable('removeNode',row.data('tt-id'));

			// удаляем все линки
			var links = self.model.filter(function(el){
				return el.get("datalink")==elem.get("_id");
			});
			links.forEach(function(el){
				//self.model.remove(el);
				self.$el.find("table.treetable").treetable('removeNode',el.get('_id'));
			});
		},
		'error':function(){
			$.unblockUI();
			showmsg("Ошибка сервера")
		}
		});
	},
	/**

	* Клонирование элемнета
	**/
	onCopyElementClick:function(currentTarget){
		var self = this;
		var row = $(currentTarget);
		var elem = self.model.get(row.data('tt-id'));

		Routine.showLoader();
		// сохранить данные
		$.ajax({
			type: "PUT",
			url: "/handlers/esuddata/copyelem",
			data: JSON.stringify(elem),
			timeout: 55000,
			contentType: 'application/json',
			dataType: 'json',
			async:true
			}).done(function(result) {
				Routine.hideLoader();
				if(result['status']=="error")
					console.log('Ошибка выполнения операции. Подробности: ' + result['msg']);
				else
				{

					//console.log('--------------------');
					//console.log(JSON.stringify(result['old_data']))
					//console.log(JSON.stringify(result['data']))

					var data = result['data'];
					// мержинг  новых данных в коллекцию
					var newData = new TreeDataCollection(data);
					self.model.add(newData.models,{merge:true});
					// построение дерева
					var parent_node =null;
					if(elem.get('parent_id'))
						parent_node = self.$el.find("table.treetable").treetable('node',elem.get('parent_id'))
					var query = "";
					var elems = [];
					newData.forEach(function(elem){
						elems.push(self.row_template(elem.toJSON()).replace(/^\s+|\s+$/g, ''));
						query+= "[data-tt-id='"+elem.get('_id')+"'],";
					},this);
					self.$el.find("table.treetable").treetable('loadBranch',parent_node,elems.join(''));
					newData.forEach(function(elem){
						self.$el.find("table.treetable").treetable('expandNode',elem.get('_id'));
					},this);

					// навешивание таскания
					var items = null;
					if(query!="")
					{
						query= "tr" + query.slice(0,-1);
						//console.log(query);
						self.$("table.treetable").find(query).draggable({
							helper: "clone",
							opacity: .75,
							refreshPositions: true,
							revert: "invalid",
							revertDuration: 300,
							scroll: true,
							start: function( event, ui ) {
								items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$($(ui.helper).context).data('tt-parent-id')+'"]');
								self.onStartDrag(event,ui, items);
							},
							stop: function( event, ui )
							{
								self.onEndDrag(event,ui, items);
							}
						});
					}
				}
		});
	},
	onEditElementClick:function(currentTarget){
		var self = this;
		var row = $(currentTarget);
		var elem = self.model.get(row.data('tt-id'));
		var dlg = new EditElementDlg({model:elem.toJSON()});

		dlg.on("dialogclose",function(){
			Backbone.trigger('unHighLightActiveItem',[row]);
			self.$el.find(".highlight1").removeClass('highlight1');
		},self);

		dlg.on("dialogsave",function(){

			$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
			elem.set("name",dlg.$el.find(".name").val());
			elem.set("type",dlg.$el.find(".type").val());
			elem.set("note",dlg.$el.find(".note").val());
			elem.save(elem.toJSON(),{'success':function(){
				$.unblockUI();
				self.updateRow(elem);
				// обновляем все линки
				var links = self.model.filter(function(el){
					return el.get("datalink")==elem.get("_id");
				});
				links.forEach(function(el){
					el.set("name",elem.get("name"));
					el.set("note",elem.get("note"));
					el.set("type",elem.get("type"));
					self.updateRow(el);
				});
				self.delegateEvents();
			},error:function(){
				$.unblockUI();
				showmsg("Ошибка сервера");
			}});
		},self);
	},
	onLinkClick:function(currentTarget){
		var row =$(currentTarget);
		$("#treedata-view").addClass("link-edit");
		row.addClass("insert-row");
	},
	onMoveClick:function(currentTarget){
		var row =$(currentTarget);
		$("#treedata-view").addClass("link-edit");
		row.addClass("insert-row");
	},
	onLinkCancel:function(e){
		var row = $($(e.currentTarget).parents("tr")[0]);
		$("#treedata-view").removeClass("link-edit");
		row.removeClass("insert-row");
		// обновеление контекстного меню
		this.contextMenu.find(".menu-item-default").show();
		this.contextMenu.find(".menu-item-operation").hide();
		this.contextMenu.data('state','default');
	},
	onLinkCancelM:function(currentTarget){
		var row =$(currentTarget);
		$("#treedata-view").removeClass("link-edit");
		row.removeClass("insert-row");
	},
	onMoveCancelM:function(currentTarget){
		var row =$(currentTarget);
		$("#treedata-view").removeClass("link-edit");
		row.removeClass("insert-row");
	},
	onSetLinkM:function(currentTarget){
		var self = this;
		var cRow =$(currentTarget);
		var pRow = self.$el.find(".insert-row");
		var parent_elem = self.model.get(pRow.data('tt-id'));
		var routine_index = self.getMinRoutine(parent_elem.get('_id'))-1;
		var copy_elem = self.model.get(cRow.data('tt-id'));
		$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
		var newElem = new TreeDataModel({name:copy_elem.get("name"),type:copy_elem.get("type"),parent_id:parent_elem.get("_id"),"path":(parent_elem.get("path")?(parent_elem.get("path")+"-"):"")+parent_elem.get("_id"),datalink:copy_elem.get("_id"), routine: routine_index, note:copy_elem.get("note")});
		newElem.save(newElem.toJSON(),{'success':function(){
				$.unblockUI();
				self.model.add(newElem);
				self.$el.find("table.treetable").treetable('loadBranch',self.$el.find("table.treetable").treetable('node',pRow.data('tt-id')),self.row_template(newElem.toJSON()).replace(/^\s+|\s+$/g, ''));

				var items = null;
				self.$("table.treetable").find('tr[data-tt-id="'+newElem.get('_id')+'"]').draggable({
					helper: "clone",
					opacity: .75,
					refreshPositions: true,
					revert: "invalid",
					revertDuration: 300,
					scroll: true,
					start: function( event, ui ) {
						items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$($(ui.helper).context).data('tt-parent-id')+'"]');
						self.onStartDrag(event,ui, items);
					},
					stop: function( event, ui )
					{
						self.onEndDrag(event,ui, items);
					}
				});

				self.delegateEvents();

				$("#treedata-view").removeClass("link-edit");
				$("#treedata-view .insert-row").removeClass("insert-row");
			},error:function(){
				$.unblockUI();
				showmsg("Ошибка сервера");
			}});
	},
	onSetMoveM:function(currentTarget){
		var self = this;
		var cRow =$(currentTarget);
		var pRow = self.$el.find(".insert-row");
		var parent_elem = self.model.get(pRow.data('tt-id'));
		var routine_index = self.getMinRoutine(parent_elem.get('_id'))-1;

		var copy_elem = self.model.get(cRow.data('tt-id'));
		copy_elem.set("parent_id",parent_elem.get("_id"));
		copy_elem.set("path",(parent_elem.get("path")?(parent_elem.get("path")+"-"):"")+parent_elem.get("_id"));
		copy_elem.set('routine', routine_index);

		$.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});

		copy_elem.save(copy_elem.toJSON(),{'success':function(){
			$.unblockUI();
			self.updateRow(copy_elem);
			/*// обновляем все линки
			var links = self.model.filter(function(el){
				return el.get("datalink")==elem.get("_id");
			});
			links.forEach(function(el){
				el.set("name",elem.get("name"));
				el.set("type",elem.get("type"));
				self.updateRow(el);
			});*/
			$("#treedata-view").removeClass("link-edit");
			$("#treedata-view .insert-row").removeClass("insert-row");


			cRow.data('tt-parent-id', pRow.data('tt-id'));
			self.$el.find("table.treetable").treetable('move',copy_elem.get('_id'), parent_elem.get('_id'));


			self.delegateEvents();
		},error:function(){
			$.unblockUI();
			showmsg("Ошибка сервера");
		}});

	},
	onGoToLink:function(e){
		var row = $($(e.currentTarget).parents("tr")[0]);
		var elem = this.model.get(row.data('tt-id'));
		var pr = this.model.get(elem.get('datalink'));
		if(!pr)
			return;
		while(pr.get("parent_id")){
			this.$el.find("table.treetable").treetable('expandNode',pr.get("parent_id"));
			pr = this.model.get(pr.get("parent_id"));
		}
		var prel = this.$el.find("[data-tt-id="+elem.get('datalink')+"]");
		window.scrollTo(0,prel.offset().top);
		setTimeout(function(){
			prel.addClass("highlight");
			setTimeout(function(){
				prel.removeClass("highlight");
			},2000);
		},100);
	},
	GoToElement:function(elem_id){
		var pr = this.model.get(elem_id);
		if(!pr)
			return;
		while(pr){
			this.$el.find("table.treetable").treetable('expandNode',pr.get("_id"));
			pr = this.model.get(pr.get("parent_id"));
		}
		var prel = this.$el.find("[data-tt-id="+elem_id+"]");
		window.scrollTo(0,prel.offset().top);
		prel.addClass("highlight");
		setTimeout(function(){
			prel.removeClass("highlight");
		},2000);
	},
	updateRow:function(elem){
		var row = this.$el.find("[data-tt-id="+elem.get("_id")+"]");
		row.find(".name .elem-name").html('[' +App.shortTypeNames[elem.get("type")]+ '] ' + elem.get("name") );
		row.find(".name span:not(.indenter):not(.elem-name)").removeClass("operation").removeClass("work").removeClass("material").removeClass("product").removeClass("property").removeClass("value").addClass(elem.get("type"));
		row.find(".type").html(elem.get("type"));
	},

	filterData: function(val)
	{
		if(val=="")
		{
			//this.$el.html("").append(this.main_tree);
			this.$el.find(".treetable.searchresult").remove();
			$("#navigationButtons .btn-add-node").removeAttr("disabled");
			this.main_tree.show();
			return;
		}

		$("#navigationButtons .btn-add-node").attr("disabled","disabled");
		this.main_tree.hide();
		function get_elems_by_path(list,path)
		{
			var res = [];
			for (var a in list)
				if (list[a].get('path')==path)
					res.push(list[a]);
			return res;
		}

		function sort_comp(list,res,path,pos)
		{
			var cnt = get_elems_by_path(list,path)
			cnt.sort(function(a, b) {return a.get('routine') - b.get('routine')});
			for (var e in cnt)
			{
				pos++;
				res.splice(pos, 0, cnt[e]);
				list.splice(list.indexOf(cnt[e]),1)
			}
			for (var row in cnt)
			{
				var p = cnt[row];
				sort_comp( list, res,((p.get('path'))?(p.get('path')+'-'+p.get('_id')):p.get('_id')), res.indexOf(p))
			}
		}

		var self = this;
	//	this.$('tbody').html("");
		var fData = [];

		// отфильтровка подходящих элементов
		val = val.toLowerCase();
		self.model.forEach(function(el){
			if(el.get('name').toLowerCase().indexOf(val)==0)
			{
				if(fData.indexOf(el)<0)
					fData.push(el);
				if(el.get('parent_id'))
				{
					var pr = self.model.get(el.get('parent_id'));
					if(fData.indexOf(pr)<0)
					{
						fData.push(pr);
						/*// собираем всех потомков текущего парента
						var childs = this.model.where({parent_id: pr.get('_id')});
						for(var n_child in childs)
							if(fData.indexOf(childs[n_child])<0)
								fData.push(childs[n_child]);*/
					}
					while(pr.get("parent_id")){
						pr = this.model.get(pr.get("parent_id"));
						if(fData.indexOf(pr)<0)
						{
							fData.push(pr);
							/*// собираем всех потомков текущего парента
							var childs = this.model.where({parent_id: pr.get('_id')});
							for(var n_child in childs)
								if(fData.indexOf(childs[n_child])<0)
									fData.push(childs[n_child]);*/
						}
					}
				}
			}
		},this);

		// получаем всех потомков отобранных родителей
		for(var i in fData)
		{
			if(fData[i].get('name').toLowerCase().indexOf(val)==0)
			{
				var childs = self.model.where({parent_id: fData[i].get('_id')});
				for(var n_child in childs)
					if(fData.indexOf(childs[n_child])<0)
						fData.push(childs[n_child]);
			}

			/*// если родитель попадает под условия поиска, то показываем его потомков
			var pr = self.model.get(fData[i].get('parent_id'));
			if(pr && pr.get('name').toLowerCase().indexOf(val)==0)
			{
				var childs = self.model.where({parent_id: fData[i].get('_id')});
				for(var n_child in childs)
					if(fData.indexOf(childs[n_child])<0)
						fData.push(childs[n_child]);
			}*/
		}

		// сортировка fData
		var res = [];
		sort_comp(fData,res,'',0)
		fData = new TreeDataCollection(res);
		/*self.$el.find("tr").hide();
		var query = "";
		fData.forEach(function(el){
			query+= "[data-tt-id='"+el.get('_id')+"'],";
		});

		if(query!="")
		{
			query=  "tr" + query.slice(0,-1);
			console.log(query);
			self.$el.find(query).show();
		}*/

		//fData.forEach(function(el){self.$('tbody').append(self.row_template(el.toJSON()));},this);
		self.$el.find(".searchresult").remove();

		var search_table = $(self.template(fData.toJSON()).replace(/^\s+|\s+$/g, ''));
		search_table.addClass("searchresult");
		self.$el.append(search_table);
		self.table = self.$el.find("table.treetable.searchresult").treetable({ expandable: true }, true);
		/*var items = null;
		self.$el.find("tr").draggable({
			helper: "clone",
			opacity: .75,
			refreshPositions: true,
			revert: "invalid",
			revertDuration: 300,
			scroll: true,
			start: function( event, ui ) {
				items = self.$("table.treetable").find('tr[data-tt-parent-id="'+$($(ui.helper).context).data('tt-parent-id')+'"]');
				self.onStartDrag(event,ui, items);
			},
			stop: function( event, ui )
			{
				self.onEndDrag(event,ui, items);
			}
		}); */

		if(self.state =='expanded')
			$("#treedata-view table.treetable.searchresult").treetable('expandAll');

		self.delegateEvents();
	}
});

var EditElementDlg = Backbone.View.extend({
	template:_.template($("#tmplNewElement").html()),
	parent_type:'',
	initialize:function(obj){
		if(obj)
			this.parent_type = obj['parent_type'];
		this.render();
	},
	events:{
		'click .btn-save':'onSaveClick'
	},
	render:function(){
		var self = this;
		this.$el.append(this.template($.extend({},this.model,{'parent_type':this.parent_type})));
		this.$el.modal({close: function(){alert('123')}});
		this.$el.on('hidden', function () {
			self.trigger("dialogclose");
		})
	},
	onSaveClick:function(){
		if(this.$el.find(".name").val()=="")
			$(this.$el.find(".name").parents(".control-group")[0]).addClass("error");
		else{
			$(this.$el.find(".name").parents(".control-group")[0]).removeClass("error");
			this.trigger("dialogsave");
			this.$el.modal('hide');
			this.$el.remove();
		}
	}
})


var TreeCopyModel = Backbone.Model.extend({
});

var TreeCopyCollection = Backbone.Collection.extend({
	model:TreeCopyModel,
	url:"/handlers/esuddata/gettreeclonelist"
})


var TreeCopyList = Backbone.View.extend({
	template_item:_.template($("#tmplCopyRowElem").html()),
	initialize:function(){
		this.model = new TreeCopyCollection();
		this.model.on("reset",this.render,this);
		this.render();
		this.model.fetch({reset:true});
	},
	events:{
		//'click .new-copy':"onCreateCopy"
	},
	render:function(){
		this.$el.find("ul").html("");
		this.model.forEach(function(el){
			this.$el.find("ul").append(this.template_item(el.toJSON()));
		},this);
		if(!this.model.length){
			this.$el.find("ul").append("<li>Копии не созданы</li>");
		}
	},
	onCreateCopy:function(){
		$.ajax({
			type: "POST",
			url: "/handlers/esuddata/clonetree",
			timeout: 55000,
			contentType: 'application/json',
			dataType: 'json',
			async:true,
			error: function (jqXHR, textStatus, errorThrown) {
				showmsg("Ошибка сервера");
			},
			success: function (result, textStatus, jqXHR) {
				alert('qq');
			}
		});
	}
});

var App = {
	Views:{},
	Collections:{},
		typeNames: {'operation':'Операция', 'material':'Материал', 'work':'Работа', 'product':'Изделие', 'library':'Библиотека', 'property':'Свойство', 'value':'Значение', 'unit':'Ед. измерения', 'product_model':'Модель изделия',  'product_model_buy':'Модель изделия покупного', 'product_buy':'Изделие покупное'},
		shortTypeNames: {'operation':'О', 'material':'М', 'work':'Р', 'product':'И', 'library':'Б', 'property':'C','value':'З', 'unit':'Е','product_model':'МИ','product_model_buy':'МИП', 'product_buy':'ИП'},
		canInclude : {
			'property':['property','value'],
			'value':['property','value'],
			'operation':['property','operation'],
			'material':['property','material'],
			'work':['product', 'material', 'operation','property'],
			'product':['product','work','material','operation','property'],
			'library':['product','work','material','library','operation','property'],
			'': ['product','work','material','library','operation','property'],
		},

		CMOperations:{
			'operation':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['add','copy', 'edit', 'remove', 'cancel','divider']
			},
			'material':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['add','copy','edit', 'remove', 'cancel','divider']
			},
			'work':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['copy','add','edit', 'remove','link','move', 'cancel','divider']
			},
			'product':{
				'link':['cancel-link','accept-link','divider'],
				'move':['cancel-move','accept-move','divider'],
				'default':['copy','add','edit', 'remove','link','move', 'cancel','divider']
			},
			'library':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['copy','add','edit', 'remove','link','move', 'cancel','divider']
			},
			'property':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['copy','add','edit', 'remove','link','move', 'cancel','divider']
			},
			'value':{
				'link':['cancel-link','accept-link','divider'],
				'move':[ 'cancel-move','accept-move','divider'],
				'default':['copy','add','edit', 'remove','link','move', 'cancel','divider']
			},
		},
	initialize:function(){
		App.Collections['TreeData'] = new TreeDataCollection(global_treedata);
		App.Views['TreeView'] = new TreeView({model:App.Collections['TreeData']});
		$("#navigationButtons").show();
		$("#treedata-view").show().append(App.Views['TreeView'].$el);
		//App.Collections['TreeData'].fetch({reset:true});
		App.Views['TreeCopyList'] = new TreeCopyList({el:$("#tree-copy-pnl")});

		App.Route = new AppRouter();
		Backbone.history.start();
	}
}


      // настраивам роуты
var AppRouter = Backbone.Router.extend({
	routes: {
	  "": "index",
	  ":id": "show"  // показать node
	},

	index:function(){
	},

	show: function(id) {
	  //alert(id);
	  App.Views['TreeView'].GoToElement(id);
	  App.Route.navigate("/"+id,false);
	}
});


//});
