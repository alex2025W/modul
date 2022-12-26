%def scripts():
	 <script src="/static/scripts/routine.js?v={{version}}"></script>
	 <script src="/static/scripts/claims/app.js?v={{version}}"></script>
	 <link href="/static/css/bootstrap-multiselect.css?v={{version}}" rel="stylesheet" media="screen">
	 <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
	 <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
	 <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
	 <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
	 <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Претензии и замечания', current_user=current_user, version=version, scripts=scripts,menu=menu

<style>
	#claims-filters{
		padding-top:10px;
	}

	#claims-filters .right{
		float:right;
	}
	#claims-filters .right input, #claims-filters .right button{
		float:left;
	}
	#claims-filters .right input{
		margin-right: 10px;
	}
	#claims-filters .line{
		float:left;
		width:100%;
	}
	.claim-add-dlg{
		width:600px;
		background: #fff;
		position: fixed;
		left:50%;
		margin-left: -340px;
		top:100px;
		z-index: 1050;
		border-radius: 10px;
		padding:40px 40px 20px 40px;
	}
	.claim-add-dlg textarea, .claim-add-dlg input{
		width:590px;
	}
	.claim-add-dlg select{
		width:605px;
	}
	.claim-add-dlg label .red{
		color:#c00;
	}
	.claim-add-dlg .buttons{
		float:left;
		text-align: right;
		margin-top: 10px;
		width:100%;
	}
	.claim-add-dlg ul.token-input-list-facebook{
		width:600px;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
	.claim-add-dlg ul.token-input-list-facebook input{
		border:none;
		box-shadow:none;
	}

	#claims-list .claim-item{
		float:left;
		width:100%;
		margin-top: 20px;
		border-bottom:dashed 1px #000;
		padding-bottom: 20px;
	}

	#claims-list .number{
		float:left;
		font-weight: bold;
		font-size:16px;
		color:#000;
		text-decoration: underline;
	}

	#claims-list .category{
		float: right;
		font-weight: bold;
		font-size:16px;

	}

	#claims-list .date{
		float:left;
		width:100%;
		color:#666;
	}

	#claims-list .description{
		float:left;
		width:100%;
		padding:10px 0;
		border:solid 1px #ddd;
		border-left:none;
		border-right: none;
	}

	#claims-list .tags{
		float:left;
		width:100%;
	}

	#claims-list .additional{
		float:left;
		width:100%;
	}

	#claims-list .additional .title{
		font-weight: bold;
		float:left;
		width:100%;
	}

	#claims-list .additional .text{
		float:left;
		width:100%;
	}

	#claims-list .contract{
		float:left;
		width:100%;
	}
	#claims-list .contract .title{
		font-weight: bold;
	}
</style>

<div  id="claims-container">
	<div class = "row hidden-print">
		<div  class="span12">
			<div class="navbar-inner" id="claims-filters">
				<button class="btn btn-default add-new-claim"><i class="icon-plus"></i>&nbsp;&nbsp;Добавить новое</button>
				<div class="right">
					<span style="float:left; margin-top:3px;">Редактирование:&nbsp;</span>
					<input type="text" name="claim-number"  placeholder="Номер замечания" /><button class="btn btn-default open-claim"><i class=" icon-search"></i>&nbsp;&nbsp;Открыть</button>
				</div>
				<div class="line">
					<div class='input-append pnl-ddl-categories' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-categories" multiple="multiple"></select></div>
					<div class='input-append pnl-ddl-tags' style='display:none; margin:3px 0px 3px 0px;'><select class="ddl-tags" multiple="multiple"></select></div>
				</div>
			</div>
		</div>
	</div>
	<div class="row">
		<div id="claims-list" class="span12">

		</div>
	</div>
</div>


<script type="text/template" id="claimAddDlgTemplate">
	<div class="claim-add-dlg">
		<fieldset>
			<label>Текст претензии/замечания<span class="red">*</span></label>
			<textarea name="description"></textarea>
			<label>Метки<span class="red">*</span></label>
			<input type="text" name="tags" />
			<label>Категория<span class="red">*</span></label>
			<select name="category">
				<option></option>
				<% for(var i in categories) {%>
					<option value="<%= categories[i]['_id'] %>"><%= categories[i]['name'] %></option>
				<% } %>

			</select>
			<label>Номер договора</label>
			<input type="text" name="contract" />
			<label>Причины</label>
			<textarea name="causes"></textarea>
			<label>Последствия</label>
			<textarea name="consequences"></textarea>
			<label>Решение</label>
			<textarea name="decision"></textarea>
			<div class="buttons">
				<button class="btn btn-success save-btn">Сохранить</button>
				<button class="btn btn-danger close-btn">Закрыть</button>
			</div>
		</fieldset>
	</div>
</script>

<script type="text/template" id="claimItem">
	<div class="claim-item">
		<a class="number" href="javascript:;">№ <%= data.number %></a>
		<span class="category"><%= data.category?categories.get(data.category).get("name"):"" %></span>
		<span class="date">Добавлено: <%= moment(data.created).add(-moment().zone(),'minutes').format("DD.MM.YYYY [в] HH:mm") %> </span>
		<div class="description">
			<%= data.description %>
		</div>
		<div class="tags">
			<% for(var i in data.tags) { %>
				<%= (i==0)?"":"," %>
				<a href="javascript:;" class="tag"><%= data.tags[i] %></a>
			<% } %>
		</div>
        <div class="additional">
			<span class="title">Причины</span>
			<span class="text"><%= data.causes?data.causes:"Не указаны" %></span>
		</div>
		<div class="additional">
			<span class="title">Последствия</span>
			<span class="text"><%= data.consequences?data.consequences:"Не указаны" %></span>
		</div>
		<div class="additional">
			<span class="title">Решение</span>
			<span class="text"><%= data.decision?data.decision:"Не указано" %></span>
		</div>
		<div class="contract">
			<span class="title">Договор:</span>
			<% if(data.contract) { %>
				<a href="javascript:;" class="contract-number"><%= data.contract %></a>
			<% } else { %>
				<span>Не указан</span>
			<% } %>
		</div>
	</div>
</script>
