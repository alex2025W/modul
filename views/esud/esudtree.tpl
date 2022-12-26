
%def scripts():
	<link href="/static/css/user.css?v={{version}}" rel="stylesheet" media="screen">
	<link href="/static/css/jquery.treetable.css?v={{version}}" rel="stylesheet" media="screen">
	<link href="/static/css/esudtree.css?v={{version}}" rel="stylesheet" media="screen">
	<script src="/static/scripts/libs/jquery.treetable.js?v={{version}}"></script>
	<script src="/static/scripts/libs/bootstrap-contextmenu.js?v={{version}}"></script>
	<script src="/static/scripts/esuddata/app.js?v={{version}}"></script>
	<script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
	<script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
	<script src="/static/scripts/routine.js?v={{version}}"></script>

	<link rel="stylesheet" href="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/themes/smoothness/jquery-ui.css" />
	<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.11.0/jquery-ui.min.js"></script>

	<script>$(function() {
				$.ajaxSetup({timeout:50000});
				bootbox.setDefaults({locale: "ru",});
				App.initialize();});
	</script>

%end

%rebase master_page/base page_title='Данные ЭСУД', current_user=current_user, version=version, scripts=scripts,menu=menu

<script type="text/javascript">
	var global_treedata = {{! tree_data }};
</script>

<div class="navbar" id="navigationButtons" style = "display:none">
	<div  class="navbar-inner" style=  "padding-top:10px">
		<div class="input-prepend input-append">
				<span class="add-on"><b class="icon-list-alt"></b></span>
				<input type="text" class="tb-search"  placeholder="Поиск" />
		</div>

		<button class="btn btn-add-node btn-right" style="display:none;"  >Добавить ветку</button>
		<button class="btn btn-expand-all btn-right"  >Развернуть все</button>
		<button class="btn btn-collapse-all btn-right"  >Свернуть все</button>
		<div class="btn-group btn-right" id="tree-copy-pnl">
			<button class="btn new-copy">Создать копию</button>
			<button class="btn dropdown-toggle" data-toggle="dropdown">
				<span class="caret"></span>
			</button>
			<ul class="dropdown-menu" id="tree-copy-list">
				<li>Копии не созданы</li>
			</ul>
		</div>
	</div>
</div>
<div id="treedata-view" style = "display:none">
</div>

<!--Context menu-->
<div id="itemContextMenu" style = "display:none" data-state='default'>
  <ul class="dropdown-menu" role="menu">
      <li class ="add"><a tabindex="-1" data-val = "add">Создать</a></li>
      <li class ="copy"><a tabindex="-1" data-val = "copy">Копировать</a></li>
      <li class ="edit"><a tabindex="-1" data-val = "edit">Редактировать</a></li>
      <li class ="remove"><a tabindex="-1" data-val = "remove">Удалить</a></li>
      <li class ="link"><a tabindex="-1" data-val = "link">Добавить ярлык</a></li>
      <li class ="move"><a tabindex="-1" data-val = "move">Переместить сюда</a></li>
      <li class ="accept-link" style = "display:none;"><a tabindex="-1" data-val = "accept-link">Применить</a></li>
      <li class ="accept-move" style = "display:none;"><a tabindex="-1" data-val = "accept-move">Применить</a></li>
      <li class="divider"></li>
      <li class ="cancel"><a tabindex="-1" data-val = "cancel">Отмена</a></li>
      <li class ="cancel-link" style = "display:none;"><a tabindex="-1" data-val = "cancel-link">Отмена</a></li>
      <li class ="cancel-move" style = "display:none;"><a tabindex="-1" data-val = "cancel-move">Отмена</a></li>
  </ul>
</div>


<script type="text/template" id="tmplCopyRowElem">
	<li data-id="<%= _id %>"><span class="date"><%= (new Date(date)).format("dd-mm-yyyy HH:MM:ss") %></span><span class="del"><span class="icon-remove"></span></span></li>
</script>

<script type="text/template" id="tmplTreeElem">
<tr data-tt-id='<%= _id %>' <% if(parent_id) { %>data-tt-parent-id="<%= parent_id %>"<% } %>>
    <td class="name">
        <span class="<%= type+(obj.datalink?' link':'') %> "><% if(obj.datalink) { %>
            <a class="link-name"><% } %>
                <span class="elem-name" title = "<%=obj.note%>">[<%= App.shortTypeNames[type] %>] <%= name %></span><% if(obj.datalink) { %>
            </a><% } %>
        </span>
    </td>
    <td class="buttons" style = "display:none;"><% if(!obj.datalink) { %><a class="btn btn-default add-btn" title = "добавить"><span class=" icon-plus"></span></a> <a class="btn btn-default edit-btn" title = "редактировать"><span class="icon-edit"></span></a> <% } %> <a class="btn btn-default remove-btn" title = "удалить"><span class="icon-remove"></span></a> <% if(!obj.datalink) { %><a class="btn btn-default link-btn" title = "добавить ссылку на материал"><span class="icon-share-alt"></span></a> <a class="btn btn-default set-link-btn" title = "выбрать материал"><span class="icon-ok"></span></a> <a class="btn btn-default cancel-link-btn" title = "отменить добавление материала"><span class=" icon-remove-circle"></span></a><% } %></td>
</tr>
</script>

<script type="text/template" id="tmplTreeView">
<table class="treetable table">
	<thead>
		<tr>
			<th>Название</th>
			<th style = "display:none;"></th>
		</tr>
	</thead>
	<tbody><% var tmplrow = _.template($("#tmplTreeElem").html());
			for(var i in obj) { %><%= tmplrow(obj[i]) %><% } %>
	</tbody>
</table>
</script>

<script id="tmplNewElement" type="text/template">
	<div class="modal new-element-dlg">
		<div class="modal-header">
			<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>
			<h5><%= obj?"Редактирование элемента":"Добавление элемента" %></h5>
		</div>
		<div class="modal-body form-horizontal">
			<div class="control-group">
				<label class="control-label">Название</label>
				<div class="controls">
					<input type="text" placeholder="Название" class="name" value="<%= obj?obj.name:"" %>">
				</div>
			</div>
			<div class="control-group">
				<label class="control-label">Тип</label>
				<div class="controls">
					 <select class="type"><%if( '_id' in obj){%>
						<option value="<%=obj.type%>" selected><%=App.typeNames[obj.type]%></option><%}
					 else{
						for(var i in App.canInclude[parent_type]){%>
							<option value="<%=App.canInclude[parent_type][i]%>" ><%=App.typeNames[App.canInclude[parent_type][i]]%></option><%}}%>
					</select>
				</div>
			</div>
			<div class="control-group">
				<label class="control-label">Примечание:</label>
				<div class="controls">
					<textarea  type="text" placeholder="Введите примечание" class="note" ><%= obj?obj.note:"" %></textarea>
				</div>
			</div>
		</div>
		<div class="modal-footer">
			<a href="javascript:;" class="btn btn-primary btn-save">Сохранить</a>
			<a href="javascript:;" class="btn" data-dismiss="modal" aria-hidden="true">Закрыть</a>
		</div>
	</div>
</script>
