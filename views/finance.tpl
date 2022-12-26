
%def scripts():
    <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
    <script src="static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
    <script src="/static/scripts/finance/app.js?v={{version}}"></script>



    %if last_update_date:
        <div class="scheduler-date-update">
            Последнее обновление:
            <script>
                document.write(Routine.convertDateToLocalTime('{{! last_update_date }}'));
            </script>
        </div>
    %end

%end

%rebase master_page/base page_title='Финансы', current_user=current_user, version=version, scripts=scripts, menu=menu

<style>
    .contract-finance-cnt table{
        width:100%;
    }
    .contract-finance-cnt table td{
        border:solid 1px #000;
        padding:5px 10px;
    }
    .more-info{
        float:right;
        font-size:12px;
        padding-top:10px;
        clear: both;
    }
    .more-info-data, .rest-by-months-data {
        float:left;
        width:100%;
        padding-top:20px;
        display: none;
    }
    .rest-by-months-data{
        display: block;
    }

    .rest-by-months-data .month{
        font-weight: bold;
    }

    .contract-finance-cnt .more-info-data td, .rest-by-months-data td{
        font-size:12px;
        border-color: #999;
    }
    .contract-finance-cnt .more-info-data .odd td, .rest-by-months-data .odd td{
        background: #FFFBF4;
    }

    .rest-by-months-data .contracts-more{
        display: none;
    }

    .rest-by-months-data .more-less{
        color:#000;
        text-decoration: none;
        border-bottom: dashed 1px;
    }

    .rest-by-months-data td.month{
        width:170px;
    }

    .rest-by-months-data td.debt{
        width:180px;
    }

    .orders-size{
        display:none;
    }

    .contracts-more .ln{
        margin-bottom:4px;
    }

    .size.show-more{
        cursor:pointer;
        border-bottom: dashed 1px;
    }

</style>

<script>
    var monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
</script>


<div class="contract-finance" style="font-size:16px;">
    <table style="width:100%;">
        <tr>
            <td style="width:100%; vertical-align: top;">
                <div>
                    <a href="/stats/finance">Выгрузка плановых платежей</a> |
                    <a href="/stats/finance/vers1">Выгрузка заказов в работе</a>
                </div>
                <div id="contractFinanceKaluga" class="contract-finance-cnt">

                </div>
            </td>
<!--
            <td style="width:50%; vertical-align: top;">
                <div class="contract-finance-cnt">
                    <h3>Пенза</h3>
                    <table><tr><td>Всего по открытым договорам:</td><td align='right'>&nbsp;- р.</td></tr>
                    <tr><td>Запланировано по платежам:</td><td align='right'>&nbsp;- р.</td></tr>
                    <tr><td>разница (всего-запланировано):</td><td align='right'>&nbsp;- р.</td></tr>
                    <tr><td colspan='2'>&nbsp;</td></tr>
                    <tr><td>Факт по платежам:</td><td align="right">&nbsp;- р.</td></tr>
                    <tr><td>Остаток всего:</td><td align="right">&nbsp;- р.</td></tr>
                    <tr><td>в т.ч. задолженность:</td><td align="right">&nbsp;- р.</td></tr></table>
                </div>
            </td> -->
        </tr>
    </table>
</div>


<script type="text/template" id="contractFinanceTemplate">
    <h3><%= factory %></h3>
    <table><tr><td>Всего по открытым договорам:</td><td align='right'>&nbsp;<%= Routine.priceToStr(total.cost || 0) %> р.</td></tr>
    <tr><td>Запланировано по платежам:</td><td align='right'>&nbsp;<%= Routine.priceToStr(total.plan || 0) %> р.</td></tr>
    <tr><td>разница (всего-запланировано):</td><td align='right'>&nbsp;<%= Routine.priceToStr((total.cost || 0)-(total.plan || 0)) %> р.</td></tr>
    <tr><td colspan='2'>&nbsp;</td></tr>
    <tr><td>Факт по платежам:</td><td align="right">&nbsp;<%= Routine.priceToStr(total.fact || 0) %> р.</td></tr>
    <tr><td>Остаток всего:</td><td align="right">&nbsp;<%= Routine.priceToStr((total.plan || 0)-(total.fact || 0)) %> р.</td></tr>
    <tr><td>в т.ч. задолженность:</td><td align="right">&nbsp;<%= Routine.priceToStr(total.debt || 0) %> р.</td></tr>
    <tr><td colspan="2">
        <% for(var i=0;i<(total.numbers ||[]).length;++i) {%>
            <a href="/contracts#search/<%= total.numbers[i] %>"><%= total.numbers[i] %></a>;
        <% } %>
        <br>
        <a class="more-info" href="javascript:;">Подробнее по договорам</a>
        <div class="more-info-data">
            <h2>Финансы по договорам</h2>
            <table>
                <tr>
                    <th>№ договора</th>
                    <th>Всего</th>
                    <th>План</th>
                    <th>Разница</th>
                    <th>Факт</th>
                    <th>Остаток</th>
                    <th>Задолженность</th>
                </tr>
                <% more.map(function(item,index){ %>
                    <tr <%= (index%2)?'class="odd"':'' %>>
                        <td><%= item.parent_number?(item.parent_number+"/"):'' %><%= item.number %></td>
                        <td><%= Routine.priceToStr(item.total.cost || 0) %></td>
                        <td><%= Routine.priceToStr(item.total.plan || 0) %></td>
                        <td><%= Routine.priceToStr((item.total.cost || 0) -(item.total.plan || 0)) %></td>
                        <td><%= Routine.priceToStr(item.total.fact || 0) %></td>
                        <td><%= Routine.priceToStr((item.total.plan ||0)-(item.total.fact || 0)) %></td>
                        <td><%= Routine.priceToStr(item.debt || 0) %></td>
                    </tr>
                <% }); %>
            </table>
        </div>
        <div class="rest-by-months-data">
            <h2>Остатки по месяцам</h2>
            <table>
                <tr>
                    <th>Месяц</th>
                    <th>Остаток</th>
                    <th>Договора</th>
                </tr>
                <% var full = 0; %>
                <% if(bymonth_rest.rest) { %>
                        <tr <%= (r_index%2)?'class="odd"':'' %>>
                            <td class="month">не запланировано</td>
                            <td><%= Routine.priceToStr(bymonth_rest.rest) %> р.</td>
                            <td><% for(var q=0;q < bymonth_rest.contracts.length;++q){ %>
                                <%= (q!=0)?';':"" %>
                                <a href="/contracts#search/<%= bymonth_rest.contracts[q].number %>"><%= bymonth_rest.contracts[q].number %></a>
                            <% } %></td>
                        </tr>
                        <% full+=bymonth_rest.rest; %>
                <% } %>
                <% if(bymonth && bymonth.length>0) {
                    var fmonth = bymonth[0].month,
                        fyear = bymonth[0].year,
                        index = 0, r_index = 0;
                    while(index < bymonth.length){ %>
                        <tr <%= (r_index%2)?'class="odd"':'' %>><td class="month"><%= monthNames[fmonth-1] %>, <%=  fyear %></td>
                            <% if(bymonth[index].month==fmonth && bymonth[index].year==fyear) {%>
                                <td class="debt"><a href="" class="more-less"><%= Routine.priceToStr(bymonth[index].rest) %> р.</a></td>
                                <td>
                                <div class="contracts-less">
                                    <% for(var q=0;q < bymonth[index].contracts.length;++q){ %>
                                        <%= (q!=0)?';':"" %>
                                            <a href="/contracts#search/<%= bymonth[index].contracts[q].number %>"><%= bymonth[index].contracts[q].number %></a>
                                        <% } %>
                                </div>
                                <div class="contracts-more">
                                    <% for(var q=0;q < bymonth[index].contracts.length;++q){ %>
                                        <div class="ln">
                                            <a href="/contracts#search/<%= bymonth[index].contracts[q].number %>"><%= bymonth[index].contracts[q].number %></a> : <span class="size <%= bymonth[index].contracts[q].orders?'show-more':'' %> "><%= Routine.priceToStr(bymonth[index].contracts[q].size || 0) %> р.</span>
                                            <% if(bymonth[index].contracts[q].orders){ %>
                                            <span class="orders-size">
                                                =
                                                <% bymonth[index].contracts[q].orders.map(function(ord){ %>
                                                    <i><%= ord['number'] %></i>: <%= Routine.priceToStr(ord['size'] || 0) %> р.;
                                                <% }); %>
                                            </span>
                                            <% } %>
                                        </div>
                                    <% } %>
                                </div>
                                </td>
                                <% full+=bymonth[index].rest %>
                            <% ++index; } else { %>
                                <td>0 р.</td><td></td>
                            <% } %>
                        </tr>
                        <%
                            r_index++;
                            fmonth--;
                            if(fmonth<=0)
                            {
                                fmonth=12;
                                fyear--;
                            }
                        } } %>
                    <tr>
                        <td class="month">Итого</td>
                        <td><%= Routine.priceToStr(full) %> р.</td>
                        <td></td>
                    </tr>

                    <!-- <td><%= Routine.priceToStr(((total.plan || 0)-(total.fact || 0))-full)  %> р.</td><td></td></tr> -->


            </table>
        </div>
    </td></tr>
    </table>
</script>
