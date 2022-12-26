<!-- Шаблон отрисовки календарной сетки -->
<script id="CalendarGridTemplate" type="text/template">
  <table class="calendar-body">
    <!-- MONTHS + YEARS-->
    <tr>
      <td>&nbsp;</td>
      <%for(var i in datesGroupedByMonths) {%>
        <td colspan="<%=datesGroupedByMonths[i].count%>">
          <%=datesGroupedByMonths[i]['title']%>
        </td>
      <%}%>
    </tr>
    <!-- DAYS -->
    <tr>
      <td>Код</td>
        <%for(var date_i in dates){%>
          <td><%=dates[date_i].format('DD')%></td>
        <%}%>
    </tr>
    <!-- WORKS + VOLUMES -->
    <%for(var i in works){ var work = works[i]; %>
      <tr>
        <td><%=work['code']%></td>
          <%for(var date_i in dates){
            var date = dates[date_i];
            var fact_work = null;
            for(var fact_i in work['fact_work']){
              if(moment(work['fact_work'][fact_i]['date']).format('YYYY_MM_DD') == date.format('YYYY_MM_DD'))
              {
                fact_work = work['fact_work'][fact_i];
                break;
              }
            }
            var plan_range = moment().range(work['date_start_with_shift'], work['date_finish_with_shift']);
            var has_plan_on_this_date = plan_range.contains(date);%>
            <td
              title = "<%=fact_work?Routine.addCommas(fact_work['scope'].toFixed(3).toString()," "):''%>"
              data-id = "<%= work['code'].toString() + '_' +  date.format('YYYY_MM_DD') %>"
              class = "<%=fact_work?'color-red': has_plan_on_this_date?'color-green':''%>">&nbsp;
            </td>
        <%}%>
      </tr>
    <%}%>
    <!-- KTU  -->
    <tr>
      <td>&nbsp;</td>
      <%for(var date_i in dates){
        var ktu_count = 0;
        if(dates[date_i].format('YYYY_MM_DD') in ktu )
          ktu_count = ktu[dates[date_i].format('YYYY_MM_DD')];%>
        <td class = "<%=ktu_count?'color-lightgrey':''%>"><%=ktu_count?ktu_count:''%></td>
      <%}%>
    </tr>

  </table>
</script>
