<!-- Шаблон контейнер для списка занных -->
<script id="KtuStatisticDataListTemplate" type="text/template">
  <!--Блок для основных данных-->
  <div class="css-treeview">
    <ul class="data-list"> </ul>
  </div>
</script>

<!-- Шаблон отображения договора -->
<script id="KtuStatisticContractItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" class = "cb-item">
    <label class="item-contract underline-ccc lbl-item h<%=level%>" style="padding-top: 2px;">
      <%=number%>
      <div class = "control-item-box">
        <div class = "item">
          <%=Routine.addCommas(Object.keys(workers).length.toFixed().toString()," ")%>
        </div>
      </div>
    </label>
    <ul class = "data-list data-contracts"></ul>
  </li>
</script>

<!-- Шаблон отображения заказа -->
<script id="KtuStatisticOrderItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" class = "cb-item">
    <label class="item-order underline-ccc lbl-item h<%=level%>">
      [<%=number%>] <%=name%>
      <div class = "control-item-box">
        <div class = "item">
          <%=Routine.addCommas(Object.keys(workers).length.toFixed().toString()," ")%>
        </div>
      </div>
    </label>
    <ul class = "data-list data-orders"></ul>
  </li>
</script>

<!-- Шаблон отображения участка -->
<script id="KtuStatisticSectorItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" class = "cb-item">
      <label class="item-sector underline-ccc lbl-item h<%=level%>">
        [<%=number%>] <%=name%>
        <div class = "control-item-box">
          <div class = "item">
            <%=Routine.addCommas(Object.keys(workers).length.toFixed().toString()," ")%>
          </div>
        </div>
      </label>
      <ul class = "data-list data-sectors"></ul>
  </li>
</script>

<!-- Шаблон отображения наряда -->
<script id="KtuStatisticWorkOrderItemTemplate" type="text/template">
  <li class = "h<%=level%>">
    <label class="lbl-plus" for="item-<%=index%>">&nbsp;</label>
    <input type="checkbox" id="item-<%=index%>" class = "cb-item">
      <label class="item-workorder lbl-item h<%=level%>">
        <%=number%>
        <div class = "control-item-box">
          <div class = "item">
            <%=Routine.addCommas(Object.keys(workers).length.toFixed().toString()," ")%>
          </div>
        </div>
      </label>
      <ul class = "data-list data-workorders"></ul>
  </li>
</script>

<!-- Шаблон отображения списка KTU -->
<script id="KtuStatisticUsersListTemplate" type="text/template">
  <!--<span style = "font-size: 20px; margin-top:10px; display: block">КТУ</span>-->
  <table class="in-info" style = "margin-top:10px;">
    <thead>
      <tr>
        <td style = "width:50%;">ФИО</td>
        <td style = "width:30%;">Email</td>
        <td style = "width:20%;">Кол-во часов</td>
      </tr>
    </thead>
    <tbody class = "ktu-statistic-body"></tbody>
  </table>
</script>

<!-- Шаблон отображения конкретного KTU -->
<script id="KtuStatisticUsersItemTemplate" type="text/template">
  <td><%=user_fio%></td>
  <td><%=user_email%></td>
  <td><%=Routine.addCommas(proportion.toFixed(2).toString()," ")%> ч</td>
</script>
