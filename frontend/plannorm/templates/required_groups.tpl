<!-- Шаблон отрисовки таблицы  -->
<script id="RequiredGroupsGridTemplate" type="text/template">
  <table class="required-body">
    <tr>
      <td class="group"><b>Группа материалов</b></td>
      <%for(var i in productions) {
        if(productions[i]['number']>0){%>
        <td><b><%=contract.number%>.<%=productions[i]['number']%></b></td>
      <%}}%>
      <!--global_materials-->
    </tr>
    <%for(var group_i in global_materials){
      var group = global_materials[group_i];
      if(group['is_active']){%>
      <tr>
        <td class="group">
          <%=group['name']%>&nbsp;[<%=group['code']%>]
        </td>
        <%for(var i in productions) {
          if(productions[i]['number']>0){%>
          <td
            class = "group-value"
            style = "width:50px"
            id="<%=productions[i]['_id']%>_<%=group['_id']%>"
            data-prod_id="<%=productions[i]['_id']%>"
            data-group_id="<%=group['_id']%>"
          >
            <a class="carousel" data-value='undefined' title="Не определено">
              <i class="fa fa-question" />
            </a>
          </td>
        <%}}%>
      </tr>
    <%}}%>
  </table>
  <div class="line" style = "margin-top:10px; display: none;">
    <button class="btn btn-primary btn-save-data" style ="">Сохранить</button>
  </div>
</script>
