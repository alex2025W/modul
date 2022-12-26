%def scripts():
     <script src="/static/scripts/routine.js?v={{version}}"></script>
     <script src="/static/scripts/transfer/app.js?v={{version}}"></script>
     <link href="/static/css/bootstrap-multiselect.css?v={{version}}" rel="stylesheet" media="screen">
     <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
     <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
     <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
     <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
     <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
%end

%rebase master_page/base page_title='Смена менеджера заявок', current_user=current_user, version=version, scripts=scripts,menu=menu, users=users

<style>
    #manager-panel{
        padding-top:10px;
    }

    #manager-panel .right{
        float:right;
    }
    #manager-panel .left{
        float:left;
    }
    #manager-panel .right input, #manager-panel .right button{
        float:left;
    }
    #manager-panel .right input{
        margin-right: 10px;
    }
    #manager-panel .line{
        float:left;
        width:100%;
    }
    .claim-add-dlg{
        width:600px;
        background: #fff;
        position: fixed;
        left:50%;
        margin-left: -340px;
        top:100px;
        z-index: 1050;
        border-radius: 10px;
        padding:40px 40px 20px 40px;
    }
    .claim-add-dlg textarea, .claim-add-dlg input{
        width:590px;
    }
    .claim-add-dlg select{
        width:605px;
    }
    .claim-add-dlg label .red{
        color:#c00;
    }
    .claim-add-dlg .buttons{
        float:left;
        text-align: right;
        margin-top: 10px;
        width:100%;
    }
    .claim-add-dlg ul.token-input-list-facebook{
        width:600px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
    .claim-add-dlg ul.token-input-list-facebook input{
        border:none;
        box-shadow:none;
    }

    #claims-list .claim-item{
        float:left;
        width:100%;
        margin-top: 20px;
        border-bottom:dashed 1px #000;
        padding-bottom: 20px;
    }

    #claims-list .number{
        float:left;
        font-weight: bold;
        font-size:16px;
        color:#000;
        text-decoration: underline;
    }

    #claims-list .category{
        float: right;
        font-weight: bold;
        font-size:16px;

    }

    #claims-list .date{
        float:left;
        width:100%;
        color:#666;
    }

    #claims-list .description{
        float:left;
        width:100%;
        padding:10px 0;
        border:solid 1px #ddd;
        border-left:none;
        border-right: none;
    }

    #claims-list .tags{
        float:left;
        width:100%;
    }

    #claims-list .additional{
        float:left;
        width:100%;
    }

    #claims-list .additional .title{
        font-weight: bold;
        float:left;
        width:100%;
    }

    #claims-list .additional .text{
        float:left;
        width:100%;
    }

    #claims-list .contract{
        float:left;
        width:100%;
    }
    #claims-list .contract .title{
        font-weight: bold;
    }

    ul.token-input-list {
        width: 269px !important;
        display: none;
    }
</style>

<div id="container">
    <div class = "row hidden-print">
        <div  class="span12">
            <div class="navbar-inner" id="manager-panel">
            </div>
        </div>
    </div>
    <br>
    <br>
    <table class="table table-bordered table-result">
      <thead>
        <tr class="info">
          <th>Номер заявки</th>
          <th>Предыдущий менеджер заявки</th>
          <th>Клиент</th>
          <th>Предыдущий менеджер клиента</th>
        </tr>
      </thead>
      <tbody>
      </tbody>
    </table>
</div>

<script id="tableRowTemplate" type="text/template">
    <tr>
        <td><%= number %></td>
        <td><%= order_old_manager %></td>
        <td><%= client_name %></td>
        <td><%= client_old_manager %></td>
    </tr>
</script>

<script id="managerPanelTemplate" type="text/template">
    <div class="left">
        <span style="float:left; margin-top:3px;">Вид переноса:&nbsp;</span>
        <select name="" id="transfer-type" style="width: 180px">
            <option value="order">Перенос по заявкам</option>
            <option value="client">Перенос по клиенту</option>
        </select>

        <div class="" style = "width:440px;">
            <div class="row form-inline">
                <div class="span4" style = "width:270px; margin-bottom:12px">
                    <input type="hidden" id="client-dropdown" style="display:none; width:265px;" >
                    <input type="text" id="orders-number"  placeholder="перечисление через запятую" style = "width:265px" />
                    <input type="text" id="clients-number"  placeholder="перечисление через запятую" style = "width:265px;display:none;" />
                </div>
                <a href = "" class="lnk lnk-open-client-card" style = "line-height:2; display:none;" title = "Открыть карту клиента" >
                      <i class="fa fa-user"></i>
                </a>&nbsp;&nbsp;
                <label class="checkbox client_with_id" style="margin: 4px 0 0 5px; display:none"><input type="checkbox" >&nbsp;по ID</label>
            </div>
        </div>
    </div>

    <div class="right">
        <span style="float:left; margin-top:3px;">Новый менеджер:&nbsp;</span>
        <select name="category" id="manager" style="width: 170px">
            <option>---</option>
            %for usr in users:
                <option value="{{ usr['email'] }}">{{ usr['email'] }}</option>
            %end
        </select>
        <button class="btn btn-default btn-save" style = "margin-left:10px;"><i class="fa fa-upload"></i>&nbsp;&nbsp;Сменить</button>
    </div>
</script>
