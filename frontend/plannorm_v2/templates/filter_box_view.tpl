<!--Sectors-->
<script id="FilterSectorItemTemplate" type="text/template">
  <div class="accordion-heading">    
    <a 
      style="font-size:16px;"
      class="accordion-toggle collapsed" 
      data-toggle="collapse" 
      data-parent="#accordion3" 
      href="#<%=_id%>">
      <span class="pull-right"><i class="icon-chevron-down"></i></span>
      <%=name%>
    </a>
  </div>
  <div id="<%=_id%>" class="accordion-body collapse">
    <div>
      <div class="accordion-inner data-categories">                  
      </div>
    </div>
  </div>
</script>
<!--Categories-->
<script id="FilterCategoryItemTemplate" type="text/template">
  <div class="accordion-heading">    
    <a class="accordion-toggle collapsed" data-toggle="collapse" data-parent="#accordion2" href="#<%=_id%>">
      <span class="pull-right"><i class="icon-chevron-down"></i></span>
      <%=name%>
    </a>
  </div>
  <div id="<%=_id%>" class="accordion-body collapse">
    <div>
      <div class="accordion-inner">
          <ul class = "pnl-prop-values"></ul>
      </div>
    </div>
  </div>
</script>
<!--Groups-->
<script id="FilterGroupItemTemplate" type="text/template">
  <label class="checkbox"><input type="checkbox" class="cb-val" <%= selected?"checked":'' %> />
    <%=name%>
  </label>
</script>