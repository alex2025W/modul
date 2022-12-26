<!-- Шаблон контейнер для списка занных -->
<script id="GroupCalculationDataListTemplate" type="text/template">
  <div class="css-treeview">
    <ul class="data-list"></ul>
    <div class="summ">
      <span class = "lbl lbl-summ"></span>
      <span style="margin-right:195px;" class="lbl"><i class="fa fa-rub"></i></span>
    </div>
  </div>

</script>

<!-- Шаблон отображения направления -->
<script id="GroupsCalculationSectorItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="litem-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="litem-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-sector lbl-item h<%=level%>"><%=name%></label>          
    <ul class = "data-list data-sectors"></ul>
    <div class = "control-item-box">
        <input
          class="tb-value"
          data-type="sector"
          data-id="<%=id%>"
          data-autocalc="<%=obj.autocalc==='yes'?'yes':'no'%>"
          type="text"
          <%=obj.autocalc==='yes'?'disabled':''%>
          value="<%=Routine.priceToStr(value)%>"
        />
        <span class="color-lightgrey lbl"><i class="fa fa-rub"></i></span>
        <span
          class="lnk lnk-autocalc"
          title="Автоматический расчет суммы по группе">
          <i style="margin-left:4px;" class="<%=obj.autocalc==='yes'?'':'color-lightgrey'%> fa fa-calculator"></i>
        </span>
      </div>
  </li>
</script>

<!-- Шаблон отображения категории -->
<script id="GroupsCalculationCategoryItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="litem-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="litem-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-category lbl-item h<%=level%>"><%=name%></label>    
    <ul class = "data-list data-categories"></ul>
    <div class = "control-item-box">
        <input
          style="margin-left:2px;"
          class="tb-value"
          data-type="category"
          data-id="<%=id%>"
          data-autocalc="<%=obj.autocalc==='yes'?'yes':'no'%>"
          type="text"
          <%=obj.autocalc==='yes'?'disabled':''%>
          value="<%=Routine.priceToStr(value)%>"
        />
        <span class="color-lightgrey lbl"><i class="fa fa-rub"></i></span>
        <span
          class="lnk lnk-autocalc"
          title="Автоматический расчет суммы по группе">
          <i style="margin-left:4px;" class="<%=obj.autocalc==='yes'?'':'color-lightgrey'%> fa fa-calculator"></i>
        </span>  
      </div>
  </li>
</script>

<!-- Шаблон отображения группы -->
<script id="GroupsCalculationGroupItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" data-id="<%=id%>" class = "cb-item">
    <label class="item-group lbl-item h<%=level%>"><%=name%></label>
    <div class = "control-item-box">
      <input 
        style="margin-left:5px;"  
        class="tb-value" 
        data-type="group" 
        data-id="<%=id%>" 
        type = "text" 
        value = "<%=Routine.priceToStr(value)%>" 
      />
      <span class="color-lightgrey lbl"><i class="fa fa-rub"></i></span>
    </div>
  </li>
</script>
