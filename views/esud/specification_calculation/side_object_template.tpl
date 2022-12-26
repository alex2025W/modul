<!--TEMPLATE SIDE OBJECT TEMPLATE -->
<script id="templateSideObject" type="text/template">
    <tr>
          <% var p1 = ""; var p2=""; var unique_props_str = "";
          if(obj){
                for(var i_pp in obj['object'].properties) {
                        if(obj['object'].properties[i_pp].datalink && obj['object'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR1_PROP']) {
                              p1 = obj['object'].properties[i_pp].value;
                        }
                        if(obj['object'].properties[i_pp].datalink && obj['object'].properties[i_pp].datalink==App.SystemObjects['items']['SHIFR2_PROP']) {
                            p2 = obj['object'].properties[i_pp].value;
                        }
                        if(obj['object'].properties[i_pp]['is_optional'] && !obj['object'].properties[i_pp]['is_techno'])
                        unique_props_str += obj['object'].properties[i_pp]['name'] + ": " + obj['object'].properties[i_pp]['value'] +  ((obj['object'].properties[i_pp]['unit'] && obj['object'].properties[i_pp]['unit']!='?')?' ' +obj['object'].properties[i_pp]['unit']:'') + '; ';
            }} %>
        <td style = "width:80%">
            <%=('number' in obj['object']['node'] && obj['object']['node']['number'])?obj['object']['node']['number']+'&nbsp;':''%><%= p1&&App.showShifrs?('<span class="lbl-light">['+p1+']</span>&nbsp;'):'' %><%=obj['object']['node']['name']%><%= p2&&App.showShifrs?('&nbsp;<span class="lbl-light">['+p2+']</span>'):'' %>
        </td>
        <td style = "width:10%"><%=obj['value']%></td>
        <td style = "width:10%"><%=obj['object']['count']['unit']%></td>
    </tr>
</script>
