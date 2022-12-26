<!--DOCUMENTS LIST-->
<script type="text/template" id="documentListTemplate">
  <div class="documents">
    <% if(!elements) { %>
      <div class="empty-text">
        По вашему запросу ничего не найдено
      </div>
    <% } %>
  </div>
  <div class="document-list-pager" <%= (count<=1)?'style="display:none"':'' %> >
    <% var start = cur_page-5;
       if (start<1) start = 1;
       var end = start+10;
       if(end>count)
        end = count;%>
      <% if(start>1) { %><span class="over">...</span><% } %>
      <% for(var i=start;i<=end;++i) {%>
      <% if(i==cur_page) {%>
        <span class="cur"><%= i %></span>
      <% } else {%>
        <a data-page="<%= i %>"><%=i %></a>
      <% } %>
      <%}%>
      <% if(end<count) { %><span class="over">...</span><% } %>
  </div>
</script>

<!--DOCUMENT LIST ITEM-->
<script type="text/template" id="documentElementTemplate">
  <div class="document-element">
    <span class="date"><%= moment(obj.date_added).add(-moment().zone(),'minutes').format("DD.MM.YYYY HH:mm:ss") %> (<a href="mailto:<%=obj.user_added%>"><%=  App.ALL_USERS[obj.user_added] %></a>)</span>
    <span class="order-number">Заказ <%= order_number %></span>
    <% if(obj.is_customer_agree) { %>
      <span class="is_agree">Согласован с заказчиком</span>
    <% } %>
    <span class="sector">Раздел: <%= section.name %></span>
    <span class="stage">Стадия: <%= stage %></span>
    <div class="files">
      <% if(obj.pdf_files && obj.pdf_files.length>0) {%>
        <span class="ttl">Документы</span>
        <% obj.pdf_files.map(function(pf){ %>
          <span class="file"><a href="https://drive.google.com/open?id=<%= pf.google_file_id %>"><%= pf.name %></a></span>
        <% }); %>
      <% } %>
      <% if(obj.source_files && obj.source_files.length>0) {%>
        <span class="ttl">Исходники</span>
        <% obj.source_files.map(function(pf){ %>
          <span class="file"><a href="https://drive.google.com/open?id=<%= pf.google_file_id %>"><%= pf.name %></a></span>
        <% }); %>
      <% } %>

      <span class="ttl">Доп. файлы</span>
      <% if(obj.dop_files && obj.dop_files.length>0) {%>
        <% obj.dop_files.map(function(pf){ %>
          <span class="file"><a href="https://drive.google.com/open?id=<%= pf.google_file_id %>"><%= pf.name %></a></span>
        <% }); %>
      <% } %>
      <div class="upload-data-manager" style="display: none; float: left; margin-top: 10px;">
        <div class="dop-files dop-files-<%=_id%>"></div>
      </div>
    </div>

    <% if(description){%>
      <span class="lbl-head">Примечание</span>
      <span class="description"><%= description %></span>
    <%}%>
  </div>
</script>
