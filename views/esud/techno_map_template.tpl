<!--ТЕХНОЛОГИЧЕСКАЯ КАРТА ЗАКАЗНЫХ ИЗДЕЛИЙ-->
<script id="technoMapTableTemplate" type="text/template">
    <!--<table class="techno-map-table">-->
        <thead>
            <tr>
            <% for(var i=operations.length-1;i>=0;--i) { %>
                <th>
                    <div class="head-container">
                        <%= operations[i].name %>
                        <div class="header"><%= operations[i].name %></div>
                    </div>
                </th>
            <% } %>
            </tr>
        </thead>
        <tbody>
        <% for(var r in table) {%>
            <tr>
                <% var row = table[r]; %>
                <% for(var c=row.length-1;c>=0;--c) { %>
                    <% if(row[c] && row[c].is_visible) {%>
                        <td rowspan="<%= row[c].rowspan %>" data-treeid="<%= row[c]?row[c].tree_id:'' %>" class="<%= row[c]?row[c].eclass:"" %> <%= (row[c].node && row[c].node.is_buy)?'is_buy':'' %> <%= row[c].is_arr?'is_arr':'' %> <%= (row[c].node && !row[c].node.is_buy)?'is_own':'' %> <%= (c==0)?'first-elem':'' %>">
                            <% if(row[c].is_arr){%>
                                <div>&#8680;</div>
                            <%} else if(row[c].node){%>
                                <div>
                                    <div>
                                        <a class = "lnk" href= "/esud/specification#number/<%=row[c].node.number%>/tab/2/optional/false" target = "_blank"><%=row[c].node.number%></a>&nbsp;<%=row[c].node.name %>
                                    </div>
                                    <% if(row[c].node.is_buy){%>
                                        <div class = "count-items">
                                            <div><%=Routine.addCommas(row[c].node['count']['value'].toFixed(4).toString()," ")%>&nbsp;<%=row[c].node['count']['unit'] %></div>
                                        </div>
                                    <%}else{%>
                                        <div class = "count-items">
                                            <div title = "всего"><%=Routine.addCommas(row[c].node['count']['value'].toFixed(4).toString()," ")%></div>
                                            <div title = "выдано">&nbsp;</div>
                                            <div title = "сдано">&nbsp;</div>
                                            <div title = "осталось">&nbsp;</div>
                                        </div>
                                    <%}%>
                                </div>
                            <%}%>
                        </td>
                    <% }else if(!row[c]){%>
                        <td></td>
                    <% } %>
                <% } %>
            </tr>
        <% } %>
        </tbody>
    <!--</table>-->
</script>
