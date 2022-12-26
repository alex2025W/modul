%def scripts():
    <link href="/static/css/stats.css?v={{version}}" rel="stylesheet" media="screen">
     <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
    <!--<script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>-->
    <script src="/static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/stats/app.js?v={{version}}"></script>
    <script>$(function() {App.initialize({{! data }},{{! weekends }});});</script>
%end
%rebase master_page/base page_title='Статистика. Производство', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--DATA TEMPLATES -->
<script id="dataTemplate" type="text/template">
    <%
    if(obj==null){%>
        <h5>Нет данных.</h5>
    <%}
    else{%>
        <!--<span class = 'font12 color-lightgrey'>* участок [10] Жестяные работы исключён, т.к. работает по планам монтажа</span>-->
        <table class = "data">
        <thead>
            <tr>
                <td>Договор</td>
                <td>Цех (дн. раб)</td>
                <td>Цех (дн. всего)</td>
                <td>Монтаж (дн. раб)</td>
                <td>Монтаж (дн. всего)</td>
                <td>Ц / М (%)</td>
            </tr>
        </thead>
        <tbody>
        <%for (var row_contract in obj){

            //var ceh_count = (('Цех' in obj[row_contract]['sector_types'])?obj[row_contract]['sector_types']['Цех']['dates'].length:0);
            //var montag_count =(('Монтаж' in obj[row_contract]['sector_types'])?obj[row_contract]['sector_types']['Монтаж']['dates'].length:0);

            var ceh_count = 0;
            var ceh_count_work = 0;
            var montag_count = 0;
            var montag_count_work = 0;

            if('Цех' in obj[row_contract]['sector_types'])
            {
                for(var i in obj[row_contract]['sector_types']['Цех']['dates'])
                {
                    var date = obj[row_contract]['sector_types']['Цех']['dates'][i];
                    if(App.Weekends.indexOf(date.substr(0,10))<=0)
                        ceh_count_work++;
                    ceh_count++;
                }
            }
            if('Монтаж' in obj[row_contract]['sector_types'])
            {
                for(var i in obj[row_contract]['sector_types']['Монтаж']['dates'])
                {
                    var date = obj[row_contract]['sector_types']['Монтаж']['dates'][i];
                    if(App.Weekends.indexOf(date.substr(0,10))<=0)
                        montag_count_work++;
                    montag_count++;
                }
            }
            var all_count = ceh_count + montag_count;%>
        <tr>
            <td style = "width:33%"><%=obj[row_contract]['contract_number'] %> <span class = 'color-lightgrey'>(<%=Routine.addCommas(obj[row_contract]['contract_square'].toFixed(3).toString(), ' ')%> м<sup>2</sup>)</span></td>
            <td style = "width:13%"><%=ceh_count_work%></td>
            <td style = "width:15%"><%=ceh_count%></td>
            <td style = "width:13%"><%=montag_count_work%></td>
            <td style = "width:15%"><%=montag_count%></td>
            <td style = "width:10%"><%=Routine.addCommas(((ceh_count>0)?(100*ceh_count)/all_count:0).toFixed(1).toString(), ' ')%></td>
        </tr>
        <%}%>
        </tbody>
        </table>
    <%}%>
</script>

<div id="stats">
    <div  class="span12">
        <!--Product Info-->
        <div class="navbar" id="navigationButtons" style = "display:none">
            <div  id = "controlPanel"  class="navbar-inner" style=  "padding-top:10px">
                <div class="input-prepend input-append">
                        <span class="add-on"><b class="icon-list-alt"></b></span>
                        <input type="text" class="tb-count"  placeholder="Количество" value = "1" disabled />
                        <button class="btn btn-calculate" disabled >Рассчитать</button>
                </div>

            </div>
        </div>
        <div id = "stats_body" class="data-body">
            <!--Data Container-->
            <div class = "line data-container"  id = "stats_data_container"></div>
        </div>
    </div>
    </div>
</div>
