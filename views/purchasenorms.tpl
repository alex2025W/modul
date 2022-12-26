%def scripts():
	<link href="/static/css/purchasenorms.css?v={{version}}" rel="stylesheet" media="screen">
 	<script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
 	<script src="/static/scripts/routine.js?v={{version}}"></script>
 	<script src="/static/scripts/purchasenorms/app.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
 	<link rel="stylesheet" href="/static/css/font-awesome.min.css?v={{version}}">
	<script>$(function() {App.initialize({{! sectors}}, {{! orders}});});</script>
%end
%rebase master_page/base page_title='Покупные изделия', current_user=current_user, version=version, scripts=scripts,menu=menu
<script id="filterItemTemplateSector" type="text/template">
    <option value = "<%=name%>" <%=(enabled)?"":"disabled"%>  <%=(checked)?"selected":""%>  ><%=name%></option>
</script>
<script id="filterItemTemplateOrder" type="text/template">
	<% for(var i in orders) { %>
		<optgroup label="<%= i %>">
			<% var ord_list = orders[i]; %>
			<% for(var j in ord_list) {%>
				<% var products_num = [];
				for(var k in ord_list[j].products)
				{
					var product = ord_list[j].products[k];
					products_num.push(product['number']);
				}%>
				<%  var is_checked = false;
					if(selected_orders.indexOf(ord_list[j].number.toString())>-1)
						is_checked = true;	%>
				<option value="<%= ord_list[j].number %>" <%=(is_checked)?"selected":""%>><%= ord_list[j].number+" [" + products_num.join('; ') + "]" %></option>
			<% } %>
		</optgroup>

	<% } %>
</script>

<style>
 	#pnlPurchaseNormsFilter .pnl-ddl-orders li label.checkbox{
 		padding-left:20px;
 	}
	#pnlPurchaseNormsFilter .multiselect-group,#pnlPurchaseNormsFilter .multiselect-all label{
		font-weight: bold;
		padding-left:10px;
	}
</style>

<div id="purchasenorms" >
	<div class = "row hidden-print">
		<div  class="span12">
			<div class="navbar">
				<div  id = "pnlPurchaseNormsFilter" class="navbar-inner" style=  "padding-top:10px" >
					<div style="">
						<div class="input-append input-prepend">
							<span class="add-on"><b class="icon-list-alt"></b></span>
							<!--Order filter-->
							<div class='input-append pnl-ddl-orders' style='display:none; margin:0px 0px 3px 0px;'><select class="ddl-orders" multiple="multiple"  ></select></div>
							<!--Sectors filter-->
							<div class='input-prepend pnl-ddl-sectors' style='display:none; margin:0px 0px 3px 0px;'><select class="ddl-sectors" multiple="multiple"  ></select></div>
							<button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; "  ><i class="icon-download-alt"></i></button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div id="pnlPurchaseNormsBody" class="purchasenorms-body">
		<div class="lbl-header"></div>
		<!--Data Container-->
		<div class = "line data-container" id="pnlPurchaseNormsContainer">
		</div>
	</div>
</div>
