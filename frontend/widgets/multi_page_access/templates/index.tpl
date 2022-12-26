<script id="MultiPageAccessTemplate" type="text/template">
  <div id = "multi-page-access">
    <span>
      Внимание, возможна потеря информации. Спецификация в данный момент уже открыта:&nbsp;
      <% for(var i in users) {
        var row = users[i];
        if(row['email'] != current_user['email']){%>
        <span><%=row['name']%> [<%=row['count']%>]</span>.
      <%}}%>
    </span>
  </div>
</script>
