%def scripts():
	<link href="/static/css/purchaseorder.css?v={{version}}" rel="stylesheet" media="screen">
 	<script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
 	<script src="/static/scripts/routine.js?v={{version}}"></script>
 	<script src="/static/scripts/purchaseorder/app.js?v={{version}}"></script>
 	<script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
 	<link rel="stylesheet" href="/static/css/font-awesome.min.css?v={{version}}">
	<script>$(function() {App.initialize({{! sectors}}, {{! orders}});});</script>
%end
%rebase master_page/base page_title='Задание на закупку', current_user=current_user, version=version, scripts=scripts,menu=menu
<script id="filterItemTemplateSector" type="text/template">
    <option value = "<%=name%>" <%=(enabled)?"":"disabled"%>  <%=(checked)?"selected":""%>  ><%=name%></option>
</script>
<script id="filterItemTemplateOrder" type="text/template">
      <% var products_num = [];
             for(var i in products)
             {
             	var product = products[i];
             	products_num.push(product['number']);
             }%>
    <option value = "<%=number%>" <%=(checked)?"selected":""%>><%=number+" [" + products_num.join('; ') + "]"%></option>
</script>

<div id="purchaseorder" >
	<div class = "row hidden-print">
		<div  class="span12">
			<div class="navbar">
				<div  id = "pnlPurchaseOrderFilter" class="navbar-inner" style=  "padding-top:10px" >
					<div style="">
						<div class="input-prepend input-append">
							<span class="add-on"><b class="icon-list-alt"></b></span>
							<!--Order filter-->
							<div class='input-append pnl-ddl-orders' style='display:none; margin:0px 0px 3px 0px;'><select class="ddl-orders" multiple="multiple"  ></select></div>
							<!--Sectors filter-->
							<div class='input-append pnl-ddl-sectors' style='display:none; margin:0px 0px 3px 0px;'><select class="ddl-sectors" multiple="multiple"  ></select></div>
						</div>
						<button type="button" id="btnDownloadStat" class="btn btn-download-stat" style = "float:right; "  ><i class="icon-download-alt"></i></button>
					</div>
				</div>
			</div>
		</div>
	</div>
	<div id="pnlPurchaseOrderBody" class="purchaseorder-body">
		<div class="lbl-header"></div>
		<!--Data Container-->
		<div class = "line data-container" id="pnlPurchaseOrderContainer">
		</div>
	</div>
</div>
