%def scripts():
    <link href="/static/css/errors.css?v={{version}}" rel="stylesheet" media="screen">
     <script src="/static/scripts/libs/underscore-1.5.2.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/jquery.jgrowl.min.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-datepicker-1.3.0.js?v={{version}}"></script>
    <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
    <script src="/static/scripts/routine.js?v={{version}}"></script>
    <script src="/static/scripts/errors/app.js?v={{version}}"></script>
    <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>

    <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
    <script>$(function() {App.initialize();});</script>


    %if last_update_date:
        <div class="scheduler-date-update">
            Последнее обновление:
            <script>
                document.write(Routine.convertDateToLocalTime('{{! last_update_date }}'));
            </script>
        </div>
    %end

%end

%rebase master_page/base page_title='CRM. Ошибки!', current_user=current_user, version=version, scripts=scripts,menu=menu

<!--Item-->
<script id="errorItem" type="text/template">
    <%if('number' in obj){%>
        <a href="/crm/<%= number %>"><%= number %></a>
    <%}%>
    <div class = "line bold">
    <span>
        <%=manager%></span>&nbsp;(<%=new Date(datetime).format("dd.mm.yyyy")%>)
    </div>
    <div class = "line">
        (<span><%=client%></span>)&nbsp;<%=msg%>
    </div>
</script>

<div id="errors" >
    <div class = "row hidden-print">
        <div  class="span12">
            <div class="navbar">
                <div  id = "pnlErrorsFilter" class="navbar-inner" style=  "padding-top:10px" >
                    <div class="input-prepend input-append">
                        <span class="add-on"><b class="icon-list-alt"></b></span>
                        <select class="ddl-users" multiple="multiple" style = "display:none">
                            %for row in users:
                                <option value="{{row['email']}}">{{row['email']}}</option>
                            %end
                        </select>
                        <button id= "btnUsersFind" class="btn btn-primary btn-filter">Показать</button>
                    </div>
                    <button id = "btnCheckErrors" type="button" class="btn btn-check"  style = "float:right; " title='Удалить неактуальные ошибки' ><i class="icon-check" ></i></button>
                </div>
            </div>
        </div>
    </div>
    <div id="pnlErrorsBody" class="errors-body">
        <div class= 'data-container' id = "pnlErrorsDataContainer"></div>
    </div>
</div>
