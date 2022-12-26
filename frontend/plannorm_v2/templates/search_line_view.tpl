<!-- Шаблон строки поиска материалов -->
<script id="SearchLineTemplate" type="text/template">
  <div class = "search-line-control">
    <div class="input-prepend input-append">
      <span class="add-on"><i class="fa fa-search"></i></span>
      <input
        type="text"
        class="filter-number"
        id="order-number"
        placeholder="поиск по материалам"
        style = "width:400px;"
        value="<%=query%>"
      />
      <span
        style="<%=!query?'display:none':''%>"
        class="add-on lnk lnk-cancel-search"
        title="отменить поиск"><i class="fa fa-times"></i>
      </span>
      <button type="submit" class="btn btn-search btn-success" >Поиск</button>
    </div>
  </div>
  <div class="color-lightgrey font11 italic" style = "padding-top:5px;">
    <%=note%>
  </div>
</script>
