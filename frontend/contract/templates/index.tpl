%import json

%def scripts():
  <link href="/static/css/jquery.autocomplete.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/static/scripts/libs/bootstrap-datepicker.js?v={{version}}"></script>
  <script src="/static/scripts/libs/backbone.defered-view-loader.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.ui.widget.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.iframe-transport.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/jquery.fileupload.js?v={{version}}"></script>
  <script type="text/javascript" src="/static/scripts/user_controls/file_uploader/backbone.google-upload-manager.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/dateformat.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootbox.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.autocomplete.min.js?v={{version}}"></script>
  <script src="/static/scripts/select2.js?v={{version}}"></script>
  <script src="/static/scripts/select2_locale_ru.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-multiselect.js?v={{version}}"></script>
  <script src="/static/scripts/libs/selectize.js?v={{version}}"></script>
  <script src="/static/scripts/libs/typeahead.bundle.min.js?v={{version}}"></script>
  <link rel="stylesheet" href="/static/css/selectize.bootstrap2.css?v={{version}}">
  <link rel="stylesheet" href="/static/css/backbone.upload-manager.css?v={{version}}"  />
  <link href="/static/css/crm.css?v={{version}}" rel="stylesheet" media="screen, print">
  <link href="/static/css/client-finder.css?v={{version}}" rel="stylesheet" media="screen, print">
  <script src="/static/scripts/routine.js?v={{version}}"></script>
  <script src="/static/scripts/libs/google_upload.js?v={{version}}"></script>
  <script src="/static/scripts/client-finder.js?v={{version}}"></script>
  <!---->
  <link href="/frontend/contract/styles/contract.css?v={{version}}" rel="stylesheet" media="screen">
  <script src="/frontend/contract/scripts/app.js?v={{version}}"></script>

  <script type="text/javascript">
    App.Models["PaymentTypes"] = {{!payment_types}};
    App.Models["PaymentUses"] = {{!payment_uses}};
    App.Models["CurrencyList"] = {{!currency_list}};
    App.Models["FactoryList"] = {{!factory_list}};
    App.glHasAccess = has_access('contracts','o');
    App.ALL_USERS = { {{!', '.join(['\'{}\':\'{}\''.format(u['email'],u['fio'] if 'fio' in u else u['email']) for u in all_users])}} };
    App.GOOGLE_API_CONFIG = {{!google_api_config}}
    App.OrderPositions = {{! order_positions }}
    App.initialize();

    /**
     * Check if current user has authorized this application.
     */
    function checkAuth() {
      gapi.auth.authorize(
        {
          'client_id': App.GOOGLE_API_CONFIG.client_id,
          'scope': App.GOOGLE_API_CONFIG.scope,
          'immediate': true
        }, handleAuthResult);
    }
    /**
     * Handle response from authorization server.
     *
     * @param {Object} authResult Authorization result.
     */
    function handleAuthResult(authResult) {
      if (authResult && !authResult.error)
      {
        // remember token id
        App.GOOGLE_API_CONFIG.token_id = authResult.access_token;
      }
      else
        $.jGrowl('Ошибка авторизации. Вам необходимо выполнить повторную авторизацию в системе.', { 'themeState':'growl-error', 'sticky':false, life: 10000 });
    }

    $(function() {
      // Reset the baseUrl of template manager
      Backbone.TemplateManager.baseUrl = '{name}';
      bootbox.setDefaults({locale: "ru"});
      $.getScript('https://apis.google.com/js/client.js?onload=checkAuth', function() { console.log('google api loaded') });

    });
  </script>
%end

%rebase master_page/base page_title='Договоры', current_user=current_user, version=version, scripts=scripts,menu=menu

<div id="contractContainer">
    <div class="row hidden-print">
        <div class="span12">
            <div class="navbar">
                <div id="pnlContractFilter" class="navbar-inner" style="padding-top:10px">
                    <div class="input-prepend input-append">
                        <span class="add-on"><b class="icon-list-alt"></b></span>
                        <input type="text" class="filter-number" id="tbContractNumber" placeholder="введите номер договора">
                        <button id="btnContractFind" class="btn btn-primary btn-filter">Открыть</button>
                    </div>
                    <button type="button" id="btnNewContract" class="btn btn-primary" style="float:right;margin-top:0;">Новый договор</button>
                    <div class="filters hidden-print" id="filters-list">
                    <div class='input-append pnl-ddl-factories' style='display:none;margin:3px 0px 3px 0px;'><select class="ddl-factories" multiple="multiple"  style = "display:none">

                    </select></div>
                    <div class='input-append pnl-ddl-statuses' style='display:none;margin:3px 0px 3px 0px;'><select class="ddl-statuses" multiple="multiple"  style = "display:none">
                      <option value="0">Подписан</option>
                      <option value="1">Не подписан</option>
                      <option value="2">Расторгнут</option>
                    </select></div>
                    <div class='input-append pnl-ddl-debt' style='display:none;margin:3px 0px 3px 0px;'>
                        <select class="ddl-debt" multiple="multiple"  style = "display:none">
                          <option value="0">До 500 тыс.</option>
                          <option value="1">От 500 до 1 млн.</option>
                          <option value="2">От 1 до 10 млн</option>
                          <option value="3">От 10 млн и выше</option>
                        </select>
                    </div>
                  </div>
                </div>
            </div>
        </div>
    </div>
    <div class="contract-edit" id="contractEditPnl"></div>
</div>

<div id="position-modal">
  <div id="position-modal-container" data-backdrop="static" class="modal hide" role="dialog" aria-hidden="true"></div>
</div>

<div id="external-positions-modal">
  <div id="external-positions-modal-container" data-backdrop="static" class="modal hide" role="dialog" aria-hidden="true"></div>
</div>

<script type="text/template" id="confirmCancelFormTemplate">
  <div class="span12 payments-edit-form">
    <form>
      <span style="font-weight:bold;  padding: 20px 0 5px 0;float: left;"><%= is_payment?"Укажите причину отмены платежа:":"Укажите причину расторжения:" %></span>
      <textarea style="width:925px; height:100px;"></textarea>
      <div class="save-btn-container text-right row" style="margin-top:20px;">
        <a class="btn btn-info save-cancelation">Подтвердить</a>
        <a class="btn btn-warning cancel-cancelation">Отменить</a>
      </div>
    </form>
  </div>
</script>

<script type="text/template" id="contractListTemplate">
  <table class="contract-list table table-striped">
    <thead>
      <tr>
        <th style="width:110px;">Номер договора</th><th>Заказчик (CRM)</th><th>Подписант</th><th style="width:110px;">Завод</th><th style="width:110px;">Статус</th>
      </tr>
    </thead>
    <tbody>
      <% for(var i in contracts) { var cc = contracts[i];%>
        <tr<% if (cc['debt'] > 0  && cc['is_signed'] == 'yes' && !obj.is_canceled) { %> class="red"<% } %>>
          <td><a href="/contracts#search/<%= cc['number'] %>"><%=cc['number'] %></a></td><td><%=cc['client_name']?cc['client_name']:"-" %></td><td><%=cc['client_signator']?cc['client_signator']:"-" %></td><td><%=cc['factory'] %></td><td><%= cc['is_canceled']?'<span style="color:#c00;">Расторгнут</span>':((cc['is_signed']=='yes')?'Подписан':'Не подписан') %></td>
        </tr>
      <% } %>
    </tbody>
  </table>
  <div class="contract-list-pager">
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


<script type="text/template" id="contractEditTemplate">
    <!--<form>-->
        <% if(!number) { %>
            <% if(obj.parent_id) {%>
              <h1>Новое доп. соглашение <%= obj.parent_number?('к договору №<a href="#/search/'+obj.parent_number+'">'+obj.parent_number+'</a>'):'' %></h1>
            <% } else { %>
              <h1>Новый договор</h1>
            <% } %>
        <% } else { %>
            <h1><%= parent_id?"Доп. соглашение":"Договор" %> №<%= number %> <%= obj.parent_number?(' к договору №<a href="#search/'+obj.parent_number+'">'+obj.parent_number+'</a>'):'' %>
            <% if(obj.orders && obj.orders.length>0) { %>
              для заяв<%= ((orders.length==1)?'ки':'ок') %> №
              <% for(var k=0;k<orders.length;++k) { %>
                <a href="/crm/<%= orders[k].number %>"><%= orders[k].number %></a>
              <% } %>
            <% } %>

            <% if (obj.is_canceled) { %>
                <span class='contract-canceled'> (Договор расторгнут <%= obj.cancel_date?moment(obj.cancel_date).format("DD.MM.YYYY"):"" %>)</span>
              <% } %> </h1>

            <% if( (obj.is_draft && obj.is_contract_signed && obj.is_edited) || (!obj.is_draft)) { %>
              <ul class="nav nav-tabs draft-clear-tab">
                <li <%= obj.is_draft?'class="active"':'' %>><a href="#" data-toggle="tab" data-type='draft'>Черновик</a></li>
                <li <%= obj.is_draft?'':'class="active"' %>><a href="#" data-toggle="tab"  data-type='clear'>Чистовик</a></li>
                <li><a href="#" data-toggle="tab"  data-type='history'>История изменений</a></li>
              </ul>
            <% }else if(obj['is_signed']=='yes') { %>
            <ul class="nav nav-tabs draft-clear-tab">
                <li <%= obj.is_draft?'class="active"':'' %>><a href="#" data-toggle="tab" data-type='draft'>Договор</a></li>
                <li><a href="#" data-toggle="tab"  data-type='history'>История изменений</a></li>
              </ul>
            <% } %>
            <div class="contract-mcontainer">
            <% if(obj.is_draft && (obj.is_contract_signed || obj.is_edited) && !obj.parent_id) { %>
              <div class="edit-on-base">
                  <a href="javascript:;" class="edit-on-base-btn">Редактировать на основании</a>
                  <br><span class="help-comment">(для редактирования необходимо добавить доп. соглашение)</span>
                  <% if(obj.is_edited && obj.base_additional) {%>
                    <fieldset class="edit-form form-horizontal">
                      <div class="control-group">
                          <label class="control-label"></label>
                          <div class="controls">
                            <b>Доп. соглашение №<%= obj.base_additional.number %></b>
                          </div>
                          <!-- <div class="controls">
                            <select id="ddlEditedAdditionalContract">
                              <option></option>
                              <% for(var i in obj.additional_contracts) {%>
                                <option value="<%= obj.additional_contracts[i]['_id'] %>" <%= (obj.edited_additional_id==obj.additional_contracts[i]['_id'])?'selected':'' %> data-number="<%= obj.additional_contracts[i]['number'] %>">№<%= additional_contracts[i].number %> от <%= moment(additional_contracts[i].date_add).format('DD.MM.YYYY') %></option>
                              <% } %>
                            </select>
                          </div> -->
                      </div>
                      <div class="control-group">
                          <label class="control-label">Комментарий:</label>
                          <div class="controls">
                            <textarea id="tbEditedComment"><%= obj.edited_comment || '' %></textarea>
                          </div>
                      </div>
                    </fieldset>
                  <% } %>

                  <% if(obj.edit_history && obj.edit_history.length>0) { %>
                    <table class="table comments-table">
                      <caption class="text-left" style = "padding: 5px;"><strong>История редактирования:</strong></caption>
                      <thead>
                        <tr>
                          <th><strong>Дата</strong></th>
                          <th><strong>Автор</strong></th>
                          <th><strong>№ доп. соглашения</strong></th>
                        </tr>
                      </thead>
                      <tbody>
                        <% for(var h in obj.edit_history) {%>
                           <tr>
                              <td class = "date"><%= moment(obj.edit_history[h]['date_add']).add(-moment().zone(),'minutes').format("DD.MM.YYYY [в] HH:mm") %></td>
                              <td><a href="mailto:<%= obj.edit_history[h]['user_email'] %>"><%= obj.edit_history[h]['user_email'] %></a><br/></td>
                              <td><a href="#search/<%= number %>/<%= obj.edit_history[h]['additional_number'] %>">№ <%= obj.edit_history[h]['additional_number'] %></a></td>
                            </tr>
                            <tr>
                                <td colspan="3" class="comments-comment">
                                      <span class="edit-comment-span"><i><%= obj.edit_history[h]['comment'] %></i></span>
                                </td>
                            </tr>
                        <% } %>
                      </tbody>
                    </table>
                  <% } %>
              </div>
            <% } %>

            <%= (obj.is_draft || obj.parent_id)?"":'<a href="/stats/contract/'+obj.number+'">Выгрузить в XLS</a><br />' %>
            <span class="last-changes" style = "width:100%; float:left;">
                <span>
                    Последние изменения: <a href="mailto:<%= user_email %>"><%= user_email %></a> (<%= moment(date_change).add(-moment().zone(),'minutes').format("DD.MM.YYYY [в] HH:mm") %>)
                </span>
                <span style = "float: right">
                <% if (App.Models.CurrentContract.has('documents') && App.Models.CurrentContract.get('documents') &&
                App.Models.CurrentContract.get('documents')['google_folder_id']){ %>

                  <a href = "https://drive.google.com/a/modul.org/#folders/<%= App.Models.CurrentContract.get('documents')['google_folder_id'] %>" target = "_blank" class="lnk lnk-google-docs" title="Перейти к документам"><i class="fa fa-folder"></i>&nbsp;Документы</a>
                <%}%>
                <% if (App.Models.CurrentContract.has('google_group') && App.Models.CurrentContract.get('google_group')){ %>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href = "https://groups.google.com/a/modul.org/forum/#!forum/<%=number%>" target = "_blank" class="lnk lnk-google-docs" title="Перейти к обсуждению"><i class="fa fa-folder"></i>&nbsp;Обсуждение</a>
                <%}%>
                </span>
            </span>

        <% } %>
        <fieldset class="main-info form-horizontal">
            <div class="control-group" <%= obj.parent_id?'style="display:none;"':'' %>>
                <label class="control-label" for="claimNumber">Номер заявки</label>
                <div class="controls">
                  <div class="el" style="float:left; margin-right:10px;">
                    <input type="text" id="claimNumber" placeholder="Номер заявки" value="">
                  </div>
                  <% if(!number) { %>
                    <a class="btn disabled" id="btnFillFromOrder" style="float:left;">Заполнить состав</a>
                  <% } %>
                </div>
            </div>
            <div class="control-group">
                <label class="control-label" for="contractDate">Дата заключения</label>
                <div class="controls">
                  <input type="text" id="contractDate" placeholder="Дата заключения" value="<%= date_add?moment(date_add).add(-moment().zone(),'minutes').format('DD.MM.YYYY'):moment(new Date()).format('DD.MM.YYYY') %>" />
                </div>
            </div>

              <div class="control-group" <%= obj.parent_id?'style="display:none;"':'' %>>
                  <label class="control-label" for="clientName">Заказчик (CRM)</label>
                  <div class="controls">
                    <input type="text" id="clientName" placeholder="Название заказчика" value="<%= client_name.replace(/\"/g, '&quot;') %>">
                  </div>
              </div>

              <div class="control-group" <%= obj.parent_id?'style="display:none;"':'' %>>
                  <label class="control-label" for="clientSignator">Подписант</label>
                  <div class="controls">
                    <input type="text" id="clientSignator" placeholder="Подписант" data-id="<%= obj.client_signator_id || '' %>" value="<%= client_signator.replace(/\"/g, '&quot;') %>">
                  </div>
              </div>
              <% if(!obj.is_draft || (obj.is_contract_signed && !obj.is_edited)) { %>
                <div class="mi-overlay"></div>
              <% } %>
        </fieldset>
        <div id="products-list" <%= (obj.parent_id && obj.productions.length==0)?'style="display:none;"':'' %>></div>
        <div id="payments-list" <%= (obj.parent_id && obj.payments.length==0)?'style="display:none;"':'' %>></div>
        <fieldset class="additional-info form-horizontal">
            <div class="m-data">
                <div class="order-positions"  <%= obj.parent_id?'style="display:none;"':'' %>>
                  <div class="line-header">
                    <span class="lbl_header" style="font-size: 22px; ">Договорные позиции</span>
                  </div>
                 <% App.OrderPositions.map(function(item){ %>
                  <div class="form-inline">
                    <label class="checkbox" title="<%= item['note'] %>""><input type="checkbox" <%= (!obj.is_draft || (obj.is_contract_signed && !obj.is_edited))?'disabled':'' %>  <%= ((obj.order_positions || []).indexOf(item['_id'])>=0)?'checked':'' %> data-id="<%= item['_id'] %>" /><span><%= item['name'] %><br><em style="margin-left:0;"><%= item['note'] %></em></span></label>
                  </div>
                 <% }); %>
               </div>
               <div class="form-inline">
                  <label class="checkbox" title="Договор можно подписать только после добаления платежей на всю сумму договора и загрузки файла-договора."><input type="checkbox" id="customerIdSigned" <%= (is_signed=='yes')?'checked':'' %> <%= (obj.is_contract_signed || !obj.is_draft)?'disabled':'' %> />Договор подписан заказчиком</label>
                  <em>Договор можно подписать только после добаления платежей на всю сумму договора и загрузки файла-договора.</em>
               </div>
               <div class="form-inline">
                  <label>Дата подписания заказчиком:</label>
                  <input type="text" id="customerDateSign" <%= (!obj.is_draft || (obj.is_contract_signed && !obj.is_edited))?'disabled':'' %> style="width:100px;" value="<%= (is_signed=='yes' && sign_date)?moment(sign_date).format('DD.MM.YYYY'):'' %>" />
                  <% if(obj.is_draft && obj.is_contract_signed && !obj.is_canceled && !obj.is_edited) { %>
                    <a id="cancelContract">Расторгнуть</a>
                  <% } %>
                  <% if (obj.is_canceled) { %>
                    <span class='contract-canceled'>Расторгнут <%= obj.cancel_date?moment(obj.cancel_date).format("DD.MM.YYYY"):"" %></span>
                  <% } %>

              </div>
              <div class="form-inline">
                  <label class="checkbox">Крайний срок исполнения:</label>
                  <input type="text" id="contractFinishDate" <%= (!obj.is_draft || (obj.is_contract_signed && !obj.is_edited))?'disabled':'' %>  style="width:100px;" value="<%= deadline?moment(deadline).format('DD.MM.YYYY'):'' %>" />
              </div>
              <div class="form-inline" <%= obj.parent_id?'style="display:none;"':'' %>>
                  <label class="checkbox">Завод:</label>
                  <select style="width:114px;" id="contractFactory"  <%= (obj.is_contract_signed || payments.length>0)?'disabled':'' %>>
                    <% for(var i in App.Models["FactoryList"]) {%>
                      <option value="<%=  App.Models['FactoryList'][i]['_id'] %>" <%= (factory_id==App.Models['FactoryList'][i]['_id'])?'selected':'' %>><%=  App.Models['FactoryList'][i]['name'] %></option>
                    <% } %>
                  </select>
              </div>
              <div class="form-inline">
                  <label class="checkbox">Комментарии:</label>
                  <textarea <%= (!obj.is_draft || (obj.is_contract_signed && !obj.is_edited))?'disabled':'' %> id="contractNote"><%= note %></textarea>
              </div>
              <div class="form-inline  contract-add-number-form">
                    <a class="contract-additional-number">Дополнительно</a>
                    <div>
                      <label class="checkbox">№ договора от заказчика:</label>
                      <input type="text" <%= (!obj.is_draft || (obj.is_contract_signed && !obj.is_edited))?'disabled':'' %> style="width:100px;" id="contractCustomerNumber" value="<%= customer_number %>" />
                    </div>
              </div>

          </div>
          <div id="linked-files"></div>
        </fieldset>
        <div id="additional-contracts"></div>
        <div id="linked-contracts" ></div>
        <% if(obj.is_draft && (!obj.is_contract_signed || obj.is_edited )) {%>
          <div class="save-btn-container text-right row" style="margin:20px 0 20px 0; display: inline-block;width: 100%;">
            <a class="btn btn-info save-full-data">Сохранить</a>
            <% if(!obj.is_edited || obj.parent_id) { %>
              <a class="btn btn-success conduct-full-data" <%= (obj.is_signed=='yes')?'':'style="display:none;' %>">Провести</a>
            <% } else { %>
              <span class="conduct-warning">Чтобы провести договор, необходимо перейти в ДС и выполнить его проводку. Основной договор будет проведен автоматически.</span>
            <% } %>
            <a class="btn btn-warning cancel-full-data hide">Отменить</a>
          </div>
        <% } %>
        <!-- закрытие contract-mcontainer -->
        </div>
        <div class="contract-globalhistory-continer hide">
        </div>
    <!--</form>-->
</script>


<script id="productTableTemplate" type="text/template">
  <div class="line-header" style = "margin-bottom:30px;">
      <span class = "lbl_header" style="font-size: 22px;">Продукция</span>
  </div>
  <div class="row">
    <div class="span4">
      <div class="form-inline">
      <label>Адрес доставки<br />
      <input type="text" value="<%= total_address.replace(/"/g, '&quot;') %>" class="total-address span" <%= obj.is_draft?'':'disabled' %> /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
    </div>
    <div class="span2">
      <div class="form-inline">
        <label>Доставка (руб)<br />
        <input type="text" value="<%= Routine.priceToStr(delivery_price, '', ' ') %>" class="total-delivery span2" <%= obj.is_draft?'':'disabled' %> /></label>
      </div>
      <em>Оставить пустым, если разная доставка</em>
      </label>
    </div>
    <div class="span2">
      <div class="form-inline">
        <label>Монтаж (руб)<br />
        <input value="<%= Routine.priceToStr(montaz_price, '', ' ') %>" type="text" class="total-montaz span2" <%= obj.is_draft?'':'disabled' %> /></label>
        <label class="checkbox"><input type="checkbox" class="total-shef-montaz" <%= obj.is_draft?'':'disabled' %>> Шеф-монтаж</label>
      </div>
      <em>Оставить пустым, если разный монтаж</em>
      </label>
    </div>
    <div class="span2">
      <div class="form-inline">
        <label>Доп. стоимость (руб)<br />
        <input value="<%= Routine.priceToStr(goods_price, '', ' ') %>" type="text" class="additional-cost span2" <%= obj.is_draft?'':'disabled' %> /></label>
      </div>
      </label>
    </div>
    <div class="span2">
      <div class="form-inline">
        <label>Наценка, %<br />
        <input value="<%= markup.toString().replace('.',',') %>" type="text" class="markup span2" <%= obj.is_draft?'':'disabled' %> /></label>
      </div>
      <!--<em>Оставить пустым, если разная наценка</em>-->
      </label>
    </div>
  </div>
  <div class="row">
    <div class="linked-products" data-id="">
        <input type="text" class="linked-products-list" />
        <div class="btn btn-info fa fa-save save-linked-products"></div>
    </div>
    <table class="table table-striped span10 products-table" style = "width:95%">
      <caption class="text-left"></caption>
      <thead>
        <tr>
          <th colspan = "2"><strong>Заказ</strong></th>
          <th><strong>Название</strong></th>
          <th><strong>Назначение</strong></th>
          <th><strong>Тип</strong></th>
          <th><strong>Кол-во, ед.</strong></th>
          <th><strong>Площадь общая (кв.м)</strong></th>
          <th><strong>Товар, руб.</strong></th>
          <th><strong>Доставка, руб.</strong></th>
          <th><strong>Монтаж, руб.</strong></th>
          <th><strong>Всего, руб.</strong></th>
        </tr>
      </thead>
      <tfoot>
          <tr>
            <td colspan = "2"></td>
            <td></td>
            <td></td>
            <td class="text-right"><strong>Итого:</strong></td>
             <td><span class="total-num"></span></td>
            <td><span class="total-sq price"></span></td>
            <td><span class="total-price-goods price"></span></td>
            <td><span class="total-price-delivery price"></span></td>
            <td><span class="total-price-montag price"></span></td>
            <td><span class="total-price price" style="font-weight:bold;"></span></td>
          </tr>
      </tfoot>
      <tbody style="font-size: 12px;"></tbody>
    </table>
    <div class="span2"></div>
  </div>
  <%  var has_services = false;  productions.each(function(item){ if(item.get('product_type')=='service') has_services = true; }); if(has_services) { %>
  <div class="row">
    <span style="font-weight:bold; font-size:16px;" class="span12">Доп. позиции</span>
    <table class="table table-striped span10 services-table" style = "width:95%">
      <caption class="text-left"></caption>
      <thead>
        <tr>
          <th colspan = "2"><strong>Заказ</strong></th>
          <th><strong>Название</strong></th>
          <th><strong>Тип</strong></th>
          <th><strong>Цена (руб.)</strong></th>
          <th><strong>Продукция</strong></th>
        </tr>
      </thead>
      <tfoot>
          <tr>
            <td colspan = "3"></td>
            <td class="text-right"><strong>Итого:</strong></td>
            <td><span class="serv-total-price"></span></td>
            <td></td>
          </tr>
      </tfoot>
      <tbody>

      </tbody>
    </table>
    <div class="span2"></div>
  </div>
  <% } %>
  <div class="row" style = "width:100%">
  <div class="span12 text-right" style="float:right;">
  </div>
  </div>
  <div class="row" style = "width:100%">
    <div class="span6">
      <div class="span6 total-money">Общая сумма по договору: <span class="<%= approx?'yes':'no' %>-approx"></span> руб.</div>
    </div>
   </div>
   <div class="row" style = "width:100%">
    <div class="span12 text-right" style = "float:right; margin-top:20px;">
      <label style = "display:none; margin-right:30px;"><input в <%= is_tender?'checked':'' %> class="is-tender" type="checkbox" />&nbsp;Тендер</label>

      <a href="javascript:;" class="add-position-from-contract btn btn-warning" <%= (!obj['is_draft'] || (!App.glHasAccess && obj['_id']) || (obj['is_contract_signed'] && !obj.is_edited) || !obj.parent_id )?'style="display:none"':'style=""' %>>
          <span>+</span> Загрузить из договора
      </a>
      <a href="javascript:;" class="add-position-from-order btn btn-warning" <%= (!obj['is_draft'] ||(!App.glHasAccess && obj['_id']) || (obj['is_contract_signed'] && !obj.is_edited) || !obj.orders || obj.orders.length==0)?'style="display:none"':'style=""' %>>
          <span>+</span> Загрузить из заявки
      </a>
      <a href="javascript:;" class="add-new-position btn btn-warning" <%= (!obj['is_draft'] ||(!App.glHasAccess && obj['_id']) || (obj['is_contract_signed'] && !obj.is_edited) )?'style="display:none"':'' %>><span>+</span> Добавить продукцию</a>
      <a href="javascript:;" class="add-new-service btn btn-warning" <%= (!obj['is_draft'] ||(!App.glHasAccess &&  obj['_id']) || (obj['is_contract_signed'] && !obj.is_edited) )?'style="display:none"':'' %>><span>+</span> Добавить доп. позицию</a>
      <!--<a href="javascript:;" class="close-production btn">Назад</a>-->
    </div>
  </div>
  <div class="row">
    <div class="span12">
    <a class="quick-enter btn" href="javascript:;">Быстрый ввод</a>
    </div>
  </div>
</script>


<script id="serviceEditForm" type="text/template">
  <div class="span12 service-edit-form">
    <div class="row">
      <div class="span3">
        <label>Название:</label>
      </div>
      <div class="span7">
        <input type="text" value="<%= name.replace(/"/g, '&quot;') %>"  class="construction-name" style="width:100%;" />
      </div>
    </div>
    <div class="row">
      <div class="span3">
        <label>Тип:<br />
          <select class="service-type">
            %type = [i for i in dicts if i['type'] == 9]
            %for row in type:
              <option value="{{row['name']}}">{{row['name']}}</option>
            %end
          </select>
        </label>
      </div>
      <div class="span2">
        <label>Цена (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" <%= (product_include=='yes')?'disabled':'' %> class="construction-price"></label>
      </div>
      <div class="span3">
        <br />
        <label class="checkbox"><input type="checkbox" class="is_approx" <%= (approx=='yes')?'checked':'' %>>Цена ориентировочная</label>
      </div>
      <div class="span4">
        <br />
        <label class="checkbox"><input type="checkbox" class="isinclude_product" <%= (product_include=='yes')?'checked':'' %> >Цена включена в стоимость товара</label>
      </div>
    </div>
    <div class="row">
       <div class="form-inline">
        <label class="checkbox"><input type="checkbox" class="by_production" <%= by_production?'checked':'' %> />для определенной продукции</label>
      </div>
    </div>
    <div class="productions-table row" style="<%= (!by_production)?'display:none;':'' %>">
      <div class="pr-header ">
        <span class="span1">№</span>
        <span class="span11">Наименование</span>
      </div>
      <% // сначала продукция контракта (если это доп. соглашение) %>
      <% for(var i in parent_productions) if(!parent_productions[i].product_type) { %>
        <div class="pr-line">
          <span class="span1"><%= parent_productions[i].number %></span>
          <div class="span11">
            <span class="title"><%= parent_productions[i].name %></span>
            <div class="units form-inline">
              <label class="checkbox"><input type="checkbox" class="payment-all-units" /> <b>Все</b></label>&nbsp;
              <% for(var j=0;j<parent_productions[i].count;++j) {%>

                <% var is_chk = false; for(var u in service_units){ if(service_units[u].production_id==parent_productions[i]._id && service_units[u].unit_number==(j+1)) {is_chk=true; } }%>
                <label class="checkbox"><input type="checkbox" data-production="<%= parent_productions[i]._id %>" data-number="<%= (j+1) %>" <%= is_chk?'checked':'' %> /> <%= (j+1) %></label>&nbsp;
              <% } %>
            </div>
          </div>
        </div>
      <% } %>
      <% for(var i in productions) if(!productions[i].product_type){ %>
        <div class="pr-line">
          <span class="span1"><%= productions[i].number?productions[i].number:App.getProductionNumber(productions[i]) %></span>
          <div class="span11">
            <span class="title"><%= productions[i].name %></span>
            <div class="units form-inline">
              <label class="checkbox"><input type="checkbox" class="payment-all-units" /> <b>Все</b></label>&nbsp;
              <% for(var j=0;j<productions[i].count;++j) {%>
                <% var is_chk = false; for(var u in service_units) if(service_units[u].production_id==productions[i]._id && service_units[u].unit_number==(j+1)) is_chk=true; %>
                <label class="checkbox"><input type="checkbox" data-production="<%= productions[i]._id %>" data-number="<%= (j+1) %>" <%= is_chk?'checked':'' %> /> <%= (j+1) %></label>&nbsp;
              <% } %>
            </div>
          </div>
        </div>
      <% } %>
    </div>
      <div class="row" style="padding-top:20px">
        <label>Примечание:</label>
        <textarea class="construction-note" style="width:945px"><%= note %></textarea>
      </div>
     <div class="row">
        <div class="span12 text-right">
          <a href="javascript:;" class="btn btn-success save-position">Применить и закрыть</a>
          <a href="javascript:;" class="btn btn-info save-add-position">Применить и добавить сл.</a>
          <a href="javascript:;" class="btn btn-danger remove-position <%= (is_new)?'hide':'' %>">Удалить</a>
          <a href="javascript:;" class="btn close-position">Закрыть</a>
        </div>
      </div>

  </div>
</script>

<script id="positionItemTemplate" type="text/template">
<div class="row">
  <div class="span1">
    <input type="text" value="<%= num %>" class="pos-number" >
  </div>
  <div class="span4">
    <input type="text" value="<%= addr.replace(/"/g, '&quot;') %>" class="pos-addr" >
  </div>
   <div class="span3">
    <input type="text" value="<%= obj.delivery?obj.delivery:'' %>" class="pos-delivery" >
  </div>
  <div class="span3">
    <div class="input-prepend">
      <input type="text" value="<%= Routine.priceToStr(mont_price, '', ' ') %>" class="mont-price" style="margin-right: -1px; display: inline-block; border-radius: 4px 0 0 4px; width:90px;" >

      <select style="width:120px;" class="mont_type" disabled>
        <option value="0" <%= mont_price_type?'':'selected' %> >за единицу</option>
        <option value="1" <%= mont_price_type?'selected':'' %>>за все единицы</option>
      </select>
    </div>
      <label class="checkbox"><input type="checkbox" <%= shmontcheck %> class="pos-shmont"> Шеф-монтаж</label>
  </div>
  <div class="span1">
  <a class="remove-addr" href="javascript:;">&times;</a>
  </div>
</div>
</script>

<script id="positionTableTemplate" type="text/template">
      <div class="span12">
        <div class="row">
          <div class="span3">
            <label>Название:</label>
          </div>
          <div class="span7">
            <input type="text" value="<%= name.replace(/"/g, '&quot;') %>"  class="construction-name" style="width:100%;" />
          </div>
        </div>
        <div class="row">
          <div class="span3">
            %target = [i for i in dicts if i['type'] == 5]
            %trgs = []
            %for row in target:
                %trgs.append(row['name'])
            %end
             <label>Назначение:<br />
             <input
                    autocomplete="off"
                    data-source="{{json.dumps(trgs)}}"
                    class="constuction-target"
                    value="<%= target.replace(/"/g, '&quot;') %>"
                    type="text">
            </label>
          </div>
          <div class="span2">
            <label>Тип:<br /><select class="construction-type">
                  %type = [i for i in dicts if i['type'] == 4]
                    %for row in type:
                      <option value="{{row['name']}}">{{row['name']}}</option>
                    %end
              </select>
            </label>
          </div>
          <div class="span2">
            <label>Цена за ед. (руб.):<br /><input type="text" value="<%= Routine.priceToStr(price, '', ' ') %>" class="construction-price"></label>
            <label><input type="checkbox" class="isapprox"> Ориентировочная</label>
          </div>
          <div class="span2">
            <label>Площадь ед. (кв.м):<br /><input type="text" value="<%= square.toString().replace('.',',') %>" class="construction-sq"></label>
          </div>
          <div class="span3">
            <label class="gabar">Габариты (м):</label>
              <input type="text" value="<%= length %>" placeholder="Д" class="construction-length span1">
              <input type="text" value="<%= width %>" placeholder="Ш" class="construction-width span1">
              <input type="text" value="<%= height %>" placeholder="В" class="construction-height span1">
          </div>
        </div>
        <div class="row">
          <div class="span5">

          </div>
          <div class="span7 form-inline">

          </div>
        </div>
         <div class="row">
          <div class="span12">
            <label class="checkbox"><input type="checkbox" class="is_complect" <%= is_complect?"checked":'' %> />Комплект</label>
          </div>
        </div>
        <div class="row">
          <hr class="span12" style="margin-top:0px;">
        </div>
        <div class="row">
                <div class="span1"><strong>Кол-во ед.*</strong></div>
                <div class="span4"><strong>Адрес доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
                <div class="span3"><strong>Стоимость доставки</strong><br><em>Оставить пустым, если доставка не требуется или доставка общая</em></div>
                <div class="span3"><strong>Монтаж</strong><br><em>Оставить пустым, если монтаж не требуется или монтаж общий</em></div>
                <div class="span1"></div>
        </div>
        <div class="products-table"></div>
        <div class="row">
          <div class="span12">
            * если "Комплект" ввести кол-во штук в комплекте
          </div>
          <div class="span12 text-right bottom-spance">
            <a href="javascript:;" class="btn add-addr">Добавить адрес</a>
          </div>
        </div>
        <div class="row">
          <h3 class="span12">Итого</h3>
        </div>
        <div class="row" style = "width:100%">
          <div class="span6">
            <div class="row">
              <div class="span3 text-right">Стоимость товара: </div>
              <div class="span3"><span class="pos-total-price"></span></div>
            </div>
            <div class="row">
              <div class="span3 text-right">Стоимость монтажа: </div>
              <div class="span3"><span class="pos-total-montaz"></span></div>
            </div>
            <div class="row">
              <div class="span3 text-right">Стоимость доставки: </div>
              <div class="span3"><span class="pos-total-delivery"></span></div>
            </div>
            <div class="row">
              <div class="span3 text-right">Всего: </div>
              <div class="span3"><span class="pos-total-all"></span></div>
            </div>
          </div>
          <div class="span6">
            <div class="row">
              <div class="span3 text-right">Площадь: </div>
              <div class="span3"><span class="pos-total-sq"></span></div>
            </div>
            <div class="row">
              <div class="span3 text-right">Цена за кв.м.: </div>
              <div class="span3"><span class="pos-total-kvm"></span></div>
            </div>
          </div>
        </div>


      <div class="row">
        <div class="span12 text-right">
          <a href="javascript:;" class="btn btn-success save-position">Применить и закрыть</a>
          <a href="javascript:;" class="btn btn-info save-add-position">Применить и добавить сл.</a>
          <a href="javascript:;" class="btn btn-danger remove-position hide">Удалить позицию</a>
          <a href="javascript:;" class="btn close-position">Закрыть</a>
        </div>
      </div>
    </div>
</script>


<script id="productTableItemTemplate" type="text/template">
  <td>
    <span style = "<%=obj.parent_number?'':'display:none' %>" title="Связать с позицией из основного договора" class="fa fa-link product-link <%=(obj.linked_production)?'filled':''%> <%=_id%>"></span>
  </td>
  <td>
    <%= obj.parent_number?(obj.parent_number+"."):"" %><%= contract.get('number')?(contract.get('number')+"."):"" %><%= number?number:App.getProductionNumber(obj) %>
  </td>
  <td><%= name %>
      <% var hist_list = App.getChangeHistory(contract,'production',obj['_id']);
        if(hist_list.length>0){
          var chist = hist_list[hist_list.length-1];%>
          <br /><span class="del-caption"><i><%= (chist.operation=='create')?"Создано на основании ДС ":((chist.operation=='delete')?"Удалено на основании ДС ":"Изменено на основании ДС " ) %><%= chist.additional_id?('№'+chist.additional_number):'' %></i></span>
        <% } %>
  </td>
  <td><%= target?target:'-' %></td>
  <td><a class="show-position" href="javascript:;"><%= type?type:"-" %></a></td>
  <td><%= count %></td>
   <% var delivery = 0; var montag = 0;
     obj.positions.each(function(item){
        delivery+=parseInt(item.get('delivery')||0);
        montag +=Routine.strToFloat(item.get('mont_price')||0)*(item.get('mont_price_type')?1:count);
     });%>
  <td><span class=" price"><%= $.number( square*count, 2, ',', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( delivery, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( montag, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( price*count+montag+delivery, '0,00', ' ' ) %></span></td>
</script>


<script id="serviceTableItemTemplate" type="text/template">
  <td>
    <span style = "<%=obj.parent_number?'':'display:none' %>" title="Связать с позицией из основного договора" class="fa fa-link product-link <%=(obj.linked_production)?'filled':''%> <%=_id%>"></span>
  </td>
  <td><%= obj.parent_number?(obj.parent_number+"."):"" %><%= contract.get('number')?(contract.get('number')+"."):"" %><%= number?number:App.getProductionNumber(obj) %></td>
  <td><a class="show-position" href="javascript:;"><%= name %></a>
    <% var hist_list = App.getChangeHistory(contract,'production',obj['_id']);
        if(hist_list.length>0){
          var chist = hist_list[hist_list.length-1];%>
          <br /><span class="del-caption"><i><%= (chist.operation=='create')?"Создано на основании ДС ":((chist.operation=='delete')?"Удалено на основании ДС ":"Изменено на основании ДС " ) %><%= chist.additional_id?('№'+chist.additional_number):'' %></i></span>
        <% } %>

  </td>
  <td><%= type?type:"Неизвестно" %></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td>
    <% if(!by_production) { %>
          (вся продукция)
    <% } else { %>
      <% /*группируем юниты по продукции */ %>
      <% var prod_gr = {}; %>
      <% for(var i in service_units) { %>
            <% var u = service_units[i]; %>
            <% if(u.production_id in prod_gr)
                prod_gr[u.production_id].push(u.unit_number);
              else prod_gr[u.production_id] = [u.unit_number]; %>
          <% } %>
          <% /* выводим группы */ %>
          <% for(var i in prod_gr) { %>
             <% for(var j in productions) { %>
               <% if(productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= (productions[j].number?productions[j].number:App.getProductionNumber(productions[j]))+". "+productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <% for(var j in parent_productions) { %>
               <% if(parent_productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= parent_productions[j].number+". "+parent_productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <div class="line">
              Ед. продукции:
              <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
             </div>
          <% } %>
    <% } %>
  </td>
</script>


<script id="paymentsTableTemplate" type="text/template">
  <div class="line-header" style = "margin-bottom:30px;">
    <span class = "lbl_header" style="font-size:22px;">Платежи</span>
    <label class="checkbox" style="float:right;"><input type="checkbox" class="hideClosedPayments" <%= App.hideClosedPayments?'checked':'' %>  />Только не закрытые (есть полная или частичная неоплата)</label>
  </div>
  <div class="payments">
      <span class="empty">Платежи связаны с опциями из блока 'Продукция'. Добавить платёж можно только в том случае, если общая стоимость договора больше нуля.</span>
  </div>
  <div class="itogo" style="display:none;">
    <div class="total-money">
    <span class="itogo-sum"></span></div>
  </div>
  <div class="row" style = "width:100%;">
    <div class="span12 text-right" style = "float:right">
      <% if(obj['is_draft'] && (!obj['is_contract_signed'] || obj.is_edited)) { %>
        <a href="javascript:;" class="add-new-payment btn btn-warning"><span>+</span> Добавить платеж</a>
      <% } %>
    </div>
  </div>
</script>

<script id="paymentsElemTemplate" type="text/template">
  <% var is_show = true;
    var has_fact = false; for(var q in (obj.events || [])) {if (obj.events[q].type=='additional_payment' || obj.events[q].type=='fact_payment') has_fact=true; }
    if(App.hideClosedPayments && has_fact){
      var rest = size;
      for(var k=0;k<obj.events.length;++k){
        rest-=obj.events[k].size;
      }
      if(rest<=0)
        is_show = false;
    }  %>
  <div class="pay-elem <%= obj.is_canceled?'pay-cancelled':'' %> <%= !is_show?'hide':'' %>" >
      <a class="payment-type<%= (!contract.get('is_draft') || (contract.get('is_contract_signed') && (!contract.get('is_edited') || obj.is_canceled)))?'-signed':'' %>"><%=index%>. <%= payment_type.name %></a>

      <%if('work_order_number' in obj && obj['work_order_number']){%>
        &nbsp;[<%=work_order_number%>.<%= App.getWorkCode(work_order_id, work_id) %>:&nbsp;<a href = "/workorderdate#number/<%=work_order_number%>/search_type/workorder/sector_type//sector//workorder//work/" target = "_blank">план</a>&nbsp;|&nbsp;<a href = "/joblog#number/<%=work_order_number%>" target = "_blank">факт</a>]
      <%}%>
      <br>
      <small><i><%= payment_type.note %></i></small>
      <% if(contract.get('is_draft') && (!contract.get('is_contract_signed') || contract.get('is_edited')) && !obj.is_canceled ) { %>
        <a class="payment-cancel">Удалить платеж</a>
      <% } %>

      <!-- назначение платежа -->
        <% if(payment_use.code!=3) { %>
          <% if(!by_production) { %>
            <% if(obj['work_order_number']) {%>
            <div class="line">
              Заказ: <%= contract.get('number') %>.0.0
            </div>
            <% } %>
            <div class="line">
              Назначение: <%= payment_use.name %>
              (вся продукция)
            </div>
          <% } else { %>
            <div class="line">
              Назначение: <%= payment_use.name %>
            </div>
            <% /*группируем юниты по продукции */ %>
            <% var prod_gr = {}; %>
            <% for(var i in units) { %>
              <% var u = units[i]; %>
              <% if(u.production_id in prod_gr)
                  prod_gr[u.production_id].push(u.unit_number);
                else prod_gr[u.production_id] = [u.unit_number]; %>
            <% } %>
            <% /* выводим группы */ %>
            <% var unit_count = 0;
               var prod_elem = null;
               var prod_number = "";  %>
            <% for(var i in prod_gr) { %>
               <% for(var j in productions) { %>
                 <% if(!productions[j].product_type && productions[j]._id==i) { %>
                  <% prod_elem = productions[j]; prod_number = prod_elem.number?prod_elem.number:App.getProductionNumber(prod_elem); %>
                 <% unit_count = productions[j].count; %>
                 <%  break; }  %>
               <% }  %>

               <% if(prod_elem) {%>
                  <% if(obj['work_order_number']) {%>
                    <div class="line">
                      Заказ<%= (prod_gr[i].length>1)?'ы':''%>:
                      <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+contract.get('number')+'.'+prod_number+'.'+prod_gr[i][k] %><% } %>
                    </div>
                  <% } %>
                  <div class="line">
                    Наименование: <%= prod_number+". "+prod_elem.name  %>
                  </div>
                 <% if(unit_count!=1) { %>
                   <div class="line">
                    Ед. продукции:
                    <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
                   </div>
                 <% } %>
                <% } %>
            <% } %>
          <% } %>
        <% } else { %>
          <% if(!by_service) { %>
            <% if(obj['work_order_number']) {%>
            <div class="line">
              Заказ: <%= contract.get('number') %>.0.0
            </div>
            <% } %>
            <div class="line">
              Назначение: <%= payment_use.name %>
              (все доп. позиции)
            </div>
          <% } else {%>
            <div class="line">
              Назначение: <%= payment_use.name %>
            </div>
            <% for(var i in productions) if(productions[i].product_type=='service') { %>
              <% for(var j in services) { %>
                <% if(services[j]['service_id']==productions[i]['_id']){ %>
                  <% if(obj['work_order_number']) {%>
                    <div class="line">
                      Заказ: <%= contract.get('number') %>.<%= productions[i]['number']?productions[i].number:App.getProductionNumber(productions[i]) %>.1
                    </div>
                  <% } %>
                  <div class="line">
                    Наименование: <%= productions[i]['number']?productions[i].number:App.getProductionNumber(productions[i]) %>. <%= productions[i]['name'] %>
                  </div>
                <% } %>
              <% } %>
              <!-- </div> -->
            <% } %>
          <% } %>
        <% } %>

      <!-- /назначение платежа -->

      <% if(period && date) { %>
        <!-- план -->
        <div class="line">
          <b>План.</b> <%= (obj.model && App.getPaymentRest(obj.model)>0)?'<span class="red">Просрочен.</span>':'' %><br />
          <% if(period=='by_period') { %>
              <%= moment(date).format('DD.MM.YYYY') %> <%= obj.depends_on?('[<a href="http://int.modul.org/workorderdate#number/'+obj.depends_on.workorder_number+'/search_type/workorder/sector_type//sector//workorder//work/" target="_blank">'+obj.depends_on.workorder_number+'/'+obj.depends_on.work_code+'</a>]'):'' %> по <%= moment(date_end).format('DD.MM.YYYY') %> <%= obj.depends_on?'(по событию)':'(за период)' %>;
            <% } else if(period=='by_event') { %>
              <%= moment(date).format('DD.MM.YYYY') %> +<%= day_count %> раб. <%= Routine.Declension(day_count,['день','дня','дней']) %> (по событию);
            <% } else { %>
              <%= moment(date).format('DD.MM.YYYY') %> (по дате);
            <% } %>
        </div>
      <% } %>
        <div class="line">
          Размер: <%= Routine.priceToStr( size, '0,00', ' ' )  %> <%= obj.currency?obj.currency.name:"руб" %>.
        </div>
        <!-- /план -->

        <!-- факт -->
          <% if(obj.events && obj.events.length>0) { %>

            <% if(has_fact) {%>
              <% var rest = size; %>
              <% for(var k=0;k<obj.events.length;++k) {%>
                <div class="line">
                  <b>Факт №<%= (k+1) %>:</b><br>
                  Дата: <%= moment(obj.events[k].date_start).format('DD.MM.YYYY') %><br>
                  Размер: <%= Routine.priceToStr( obj.events[k].size, '0,00', ' ' )  %> <%= obj.currency?obj.currency.name:"руб" %>.<br>
                  <% rest-=obj.events[k].size;  %>
                  Недоплата: <%= Routine.priceToStr( rest, '0,00', ' ' )  %> <%= obj.currency?obj.currency.name:"руб" %>.<br>
                </div>
              <% } %>
            <% } %>
          <% } %>
        <!-- /факт -->

        <% if(obj.is_canceled) {%>
          <div class="line"><span class="red">Удалено на основании ДС
          <% var hist = App.getChangeHistory(contract, 'payment', obj['_id'] );
          if(hist!=null && hist.length>0 && hist[hist.length-1]['operation']=='delete'){ %>
            №<%= hist[hist.length-1].additional_number %>
          <% } %>
          </span></div>
        <% } %>
        <!-- история изменений на основании ДС -->
        <% var change_hist = App.getChangeHistory(contract, 'payment', obj['_id'] );
          if(change_hist.length>0) { %>
        <div class="line changehistory-box">
          <div class="span12" style = "margin-top:20px;">
              <table class="table comments-table">
                <caption class="text-left" style = "padding: 5px;"><strong>История изменений:</strong></caption>
                <thead>
                  <tr>
                    <th><strong>Дата</strong></th>
                    <th><strong>Автор</strong></th>
                  </tr>
                </thead>
                <tbody>
                    <%  for(var ci=0;ci<change_hist.length;++ci){
                      var chist = change_hist[ci]; %>
                      <tr>
                              <td class = "date"><%= Routine.convertDateToLocalTime(chist["date"]) %></td>
                              <td><a href="mailto:<%= chist["user_email"] %>?subject=" target = "_blank"><%= App.ALL_USERS[chist["user_email"]] %></a><br/></td>
                            </tr>
                            <tr>
                                <td colspan="2" class="comments-comment">
                                  <i><%= (chist.operation=='create')?"Создано на основании ДС ":((chist.operation=='delete')?"Удалено на основании ДС ":"Изменено на основании ДС " ) %><%= chist.additional_id?('№'+chist.additional_number):'' %></i>
                                </td>
                            </tr>
                    <% } %>
                </tbody>
              </table>
            </div>
        </div>
        <% } %>

        <!--Комментарии-->
        <div class="line comments-box">
              <div class="span12" style = "margin-top:20px;">
                  <div class="row" style = "<%=(!comments || comments.length==0)?'display:none':''%>">
                    <table class="table comments-table">
                      <caption class="text-left" style = "padding: 5px;"><strong>Комментарии:</strong></caption>
                      <thead>
                        <tr>
                          <th><strong>Дата</strong></th>
                          <th><strong>Автор</strong></th>
                        </tr>
                      </thead>
                      <tbody>
                          <% if(obj.comments && obj.comments.length>0){
                             // сортировка комментов по дате
                              for(var c_i in obj.comments){
                                  var comment = obj.comments[c_i]; %>
                                  <tr>
                                    <td class = "date"><%= Routine.convertDateToLocalTime(comment["date_add"]) %></td>
                                    <td><a href="mailto:<%= comment["user_email"] %>?subject=" target = "_blank"><%= App.ALL_USERS[comment["user_email"]] %></a><br/></td>
                                  </tr>
                                  <tr>
                                      <td colspan="2" class="comments-comment">
                                          <span class="edit-comment-span"><i><%= Routine.rNToBr(comment["comment"]) %></i></span>
                                      </td>
                                  </tr>
                          <%}}%>
                      </tbody>
                    </table>
                  </div>
                  <div class="row enter-comments" style = "display:none">
                        <div class="controls">
                            <textarea class="span12 comment-text" rows="3"  placeholder = "текс комментария"></textarea>
                        </div>
                      <div>
                          <a href="javascript:;" class="btn btn-success btn-save-comment">Сохранить</a>
                          <a href="javascript:;" class="btn btn-cancel-comment">Отмена</a>
                      </div>
                  </div>
                  <% if(contract.get('is_draft') && _id) {%>
                    <div class = "row">
                        <a href="javascript:;" class="btn btn-success btn-new-comment">Добавить комментарий</a>
                    </div>
                  <% } %>
              </div>
        </div>
        <!--Конец блока комментариев-->
  </div>
</script>

<script type="text/template" id="additionalContracts">
  <div class="additional-contracts">
    <div class="line-header">
      <span class = "lbl_header" style="font-size: 22px; ">Дополнительные соглашения</span>
    </div>
    <div class="contracts-list">
      <% for(var i in additional_contracts) { %>
        <div class="add-pos-elem">
          <a href="#search/<%= number %>/<%= additional_contracts[i].number %>">Доп. соглашение №<%= additional_contracts[i].number %> от <%= moment(additional_contracts[i].date_add).format('DD.MM.YYYY') %></a>
        </div>
      <% } %>
    </div>
    <% if(obj.is_signed=='yes') { %>
      <div class="span12 text-right" style = "float:right">
        <a href="#/add/<%= _id %>" class="add-new-additional-contract btn btn-warning"><span>+</span> Добавить доп. соглашение</a>
      </div>
    <% } %>
  </div>
</script>

<script type="text/template" id="linkedContracts">
  <div class="linked-contracts" >
    <div class="line-header"><span class = "lbl_header" style="font-size: 22px; ">Связанные договоры</span></div>
    <div class="contracts-list">
      <% if('linked_contracts' in obj && linked_contracts) {for(var i in linked_contracts) {
        if(linked_contracts[i].number!=number){%>
        <div class="add-pos-elem">
          <a href="#search/<%=linked_contracts[i].number %>"><%= linked_contracts[i].number %>. <%=linked_contracts[i].factory%></a>
        </div>
      <% }}} %>
    </div>
  </div>
</script>

<script type="text/template" id="linkedFilesTemplate">
  <div class="linked-files"  >
    <% if(obj){ %>
      <div class="line-header">
        <span class="lbl_header" style="font-size: 22px; ">Документы по договору</span><br>
        <em style = "margin-left:0px; display:none; ">Обязательно загрузите скан договора с печатью и подписью заказчика (формат: многостраничный PDF). А также, на ваше усмотрение, любые другие документы, которые имеют прямое отношение к договору.</em>
      </div>

      <!-- Договор на подписание заказчику-->
      <div class="row not-signed-contract box-files">
        <em style = "margin-left:0px;  ">Итоговый договор, который мы распечатали для подписи заказчиком. Формат: многостраничный PDF с текстом (то есть с возможность поиска по тексту).</em>
          <div class="new-files-not-signed-contract"></div>
          <div class="current-files-not-signed-contract"></div>
      </div>
      <!-- Подписанный договор-->
      <div class="row signed-contract box-files">
      <em style = "margin-left:0px;  ">Договор, подписанный заказчиком. Формат: многостраничный PDF с изображениями-сканами бумажного договора (то есть без текстовых данных, без возможности поиска по тексту).</em>
          <div class="new-files-signed-contract"></div>
          <div class="current-files-signed-contract"></div>
      </div>
      <!-- Дополнительные документы-->
      <div class="row other-files box-files">
          <em style = "margin-left:0px;  ">На ваше усмотрение, любые документы, которые имеют прямое отношение к договору.</em>
          <div class="new-files-list"></div>
          <div class="current-files-list"></div>
      </div>
    <% } else { %>
      <div class="line-header">
        <span class="lbl_header" style="font-size: 22px; ">Документы по договору</span><br>
      </div>
      <div class="row">
        <label style="margin-left:40px;">Блок загрузки документов недоступен.</label>
        <em>для договора не указана заявка либо для заявки не создан каталог документов на Google диске</em>
      </div>
    <% } %>

  </div>
</script>

<script type="text/template" id="fileItemTemplate">
  <div class="span7"><a href = "https://drive.google.com/open?id=<%=('google_file_id' in obj)?google_file_id:''%>" class="name" target = "_blank"><%= name %></a></div>
  <div class="span3"><span class="size"><%= Routine.displaySize(size) %></span></div>
  <div class="span2"><button class="btn btn-warning btn-small btn-danger btn-remove"><i class="fa fa-trash"></i>&nbsp;Удалить</button></div>
</script>

<script type="text/template" id="fileItemTemplate1">
  <div class="span7"><a href = "https://drive.google.com/open?id=<%=('google_file_id' in obj)?google_file_id:''%>" class="name" target = "_blank"><%= name %></a></div>
  <div class="span3"><span class="size"><%= Routine.displaySize(size) %></span></div>
  <div class="span2"><button class="btn btn-warning btn-small btn-danger btn-remove"><i class="fa fa-trash"></i>&nbsp;Удалить</button></div>
</script>


<script type="text/template" id="paymentsEditForm">
  <div class="span12 payments-edit-form">
    <div class="line-header">
        <span class = "lbl_header" style="font-size: 22px; "><%= is_new?"Новый платеж":"Редактировать платеж" %></span>
    </div>
    <div class="row" style="margin-top:20px;">
      <div class="form-inline">
        <label>Вид платежа:
        <select style="width:300px;" class="payment_type" data-val="<%= payment_type?payment_type._id:'' %>"></select>
        </label>
      </div>
    </div>
    <div class="row">
       <div class="form-inline">
        Назначение платежа:
        <% for(var i in App.Models["PaymentUses"]) {%>
          <label class="radio"><input type="radio" name="payment-target" data-code="<%= App.Models['PaymentUses'][i].code %>" <%= (payment_use.code==App.Models['PaymentUses'][i].code)?'checked':'' %> />
            <%=App.Models['PaymentUses'][i].name %>
          </label>
        <% } %>
      </div>
    </div>
    <div class="pay-by-production" style="<%= (payment_use.code==3 || payment_use.code==4)?'display:none;':'' %>">
      <div class="row">
         <div class="form-inline">
          <label class="checkbox"><input type="checkbox" class="by_production" <%= by_production?'checked':'' %> />Платеж по определенной продукции</label>
        </div>
      </div>
      <div class="productions-table row" style="<%= (!by_production)?'display:none;':'' %>">
        <div class="pr-header ">
          <span class="span1">№</span>
          <span class="span11">Наименование</span>
        </div>
        <% for(var i in productions) if(!productions[i].product_type){ %>
          <div class="pr-line">
            <span class="span1"><%= productions[i].number?productions[i].number:App.getProductionNumber(productions[i]) %></span>
            <div class="span11">
              <span class="title"><%= productions[i].name %></span>
              <div class="units form-inline">
                <label class="checkbox"><input type="checkbox" class="payment-all-units" /> <b>Все</b></label>&nbsp;
                <% for(var j=0;j<productions[i].count;++j) {%>
                  <% var is_chk = false; for(var u in units) if(units[u].production_id==productions[i]._id && units[u].unit_number==(j+1)) is_chk=true; %>
                  <label class="checkbox"><input type="checkbox" data-production="<%= productions[i]._id %>" data-number="<%= (j+1) %>" <%= is_chk?'checked':'' %> /> <%= (j+1) %></label>&nbsp;
                <% } %>
              </div>
            </div>
          </div>
        <% } %>
      </div>
    </div>
    <div class="pay-by-service" style="<%= (payment_use.code!=3)?'display:none;':'' %>">
      <div class="row">
         <div class="form-inline">
          <label class="checkbox"><input type="checkbox" class="by_service" <%= by_service?'checked':'' %> />Платеж по определенной доп. позиции</label>
        </div>
      </div>
      <div class="row service-list" style="<%= (!by_service)?'display:none;':'' %>">
        <% for(var i in productions) if(productions[i].product_type=='service') { %>
          <div class="pr-line">
            <% var is_checked = false %>
            <% for(var k in services) if(services[k]['service_id']==productions[i]['_id']) is_checked=true; %>
            <div class="span12"><label class="checkbox"><input type="checkbox" data-serviceid="<%= productions[i]['_id'] %>" <%= is_checked?'checked':'' %> /><%= productions[i].number?productions[i].number:App.getProductionNumber(productions[i]) %>. <%= productions[i].name %></label></div>
          </div>
        <% } %>
      </div>
    </div>
    <!--
    <% if($("#contractFactory").val()!=App.factories['KALUGA']) { %>
      <div class="row" style="border-top:solid 1px #ccc; padding-top:20px;">
         <div class="form-inline">
          <label>Срок платежа:
          <select style="width:100px;" class="payment-period">
            <option value="by_date" <%= (period=='by_date')?'selected':'' %> >Дата</option>
            <option value="by_period" <%= (period=='by_period')?'selected':'' %>>Период</option>
            <option value="by_event" <%= (period=='by_event')?'selected':'' %>>Событие</option>
          </select></label>
          <div class="by_period-pnl pl-pnl">
            с <input type="text"  style="width:100px;" class="payment-period-from" value="<%= (period=='by_period')?moment(date).format('DD.MM.YYYY'):'' %>" /> по <input type="text"  style="width:100px;" class="payment-period-to" value="<%= (period=='by_period')?moment(date_end).format('DD.MM.YYYY'):'' %>" />
          </div>
          <div class="by_date-pnl pl-pnl">
            <input type="text"  style="width:100px;" class="payment-date-value"  value="<%= (period=='by_date')?moment(date).format('DD.MM.YYYY'):'' %>" />
          </div>
          <div class="by_event-pnl pl-pnl">
            Плановая дата: <input type="text"  style="width:100px;" class="payment-event-date" value="<%= (period=='by_event')?moment(date).format('DD.MM.YYYY'):'' %>" />
            Кол-во раб. дней: <input type="text"  style="width:50px;" class="payment-event-days" value="<%= (period=='by_event')?day_count:''%>" />
          </div>
        </div>
      </div>
    <% } %>
    -->
    <div class="row">
       <div class="form-inline">
        <label>Размер платежа (руб.): <input type="text" class="payment-size" value="<%= Routine.priceToStr( size, '0,00', ' ' ) %>" />
      </div>
    </div>
    <div class="row" style="border-top:solid 1px #ccc; padding-top:20px;">
      <label>Комментарии:
        <textarea style="width:98%;" class="payment-note"><%= note %></textarea>
      </label>
    </div>
    <div class="row">
      <div class="span12 text-right">
        <a href="javascript:;" class="btn btn-success save-payment">Применить и закрыть</a>
        <a href="javascript:;" class="btn btn-info save-add-payment">Применить и добавить сл.</a>


        <a href="javascript:;" class="btn btn-danger remove-payment <%= (is_new || (obj.is_contract_signed && !obj.is_edited))?'hide':'' %>">Удалить платеж</a>
        <a href="javascript:;" class="btn close-payment">Закрыть</a>
      </div>
    </div>
  </div>
</script>

<script id="ExternalPositionsTableTemplate" type="text/template">
    <div class="line-header">
        <span class = "lbl_header" style="font-size: 22px;">Продукция</span>
    </div>
    <div class="row">
      <table class="table table-striped span10 products-table" style = "width:95%">
        <caption class="text-left"></caption>
        <thead>
          <tr>
            <th><input type="checkbox" class="cb-all products" /></th>
            <th><strong>№</strong></th>
            <th><strong>Название</strong></th>
            <th><strong>Назначение</strong></th>
            <th><strong>Тип</strong></th>
            <th><strong>Кол-во, ед.</strong></th>
            <th><strong>Площадь общая (кв.м)</strong></th>
            <th><strong>Товар, руб.</strong></th>
            <th><strong>Доставка, руб.</strong></th>
            <th><strong>Монтаж, руб.</strong></th>
            <th><strong>Всего, руб.</strong></th>
          </tr>
        </thead>
        <tbody style="font-size: 12px;"></tbody>
      </table>
      <div class="span2"></div>
    </div>
    <%  var has_services = false;  productions.each(function(item){ if(item.get('product_type')=='service') has_services = true; }); if(has_services) { %>
    <div class="row">
      <span style="font-weight:bold; font-size:16px;" class="span12">Доп. позиции</span>
      <table class="table table-striped span10 services-table" style = "width:95%">
          <caption class="text-left"></caption>
          <thead>
            <tr>
              <th>
                <input type="checkbox" class="cb-all services" />
              </th>
              <th><strong>Заказ</strong></th>
              <th><strong>Название</strong></th>
              <th><strong>Тип</strong></th>
              <th><strong>Цена (руб.)</strong></th>
              <th><strong>Продукция</strong></th>
            </tr>
          </thead>
          <tbody style="font-size: 12px;"></tbody>
      </table>
      <div class="span2"></div>
    </div>
    <% } %>
   <div class="row" style = "width:100%">
      <div class="span12 text-right" style = "float:right; margin-top:20px;">
        <a href="javascript:;" class="save btn btn-warning">Добавить</a>
        <a href="javascript:;" class="cancel btn btn-warning">Закрыть</a>
      </div>
  </div>
</script>

<script id="ExternalProductTableItemTemplate" type="text/template">
  <td>
    <input type="checkbox" class="cb-item" />
  </td>
  <td>
    <%= number?number:obj.item_number %>
  </td>
  <td><%= name %></td>
  <td><%= target?target:'-' %></td>
  <td><%= type?type:"-" %></td>
  <td><%= count %></td>
   <% var delivery = 0; var montag = 0;
     obj.positions.each(function(item){
        delivery+=parseInt(item.get('delivery')||0);
        montag +=Routine.strToFloat(item.get('mont_price')||0)*(item.get('mont_price_type')?1:count);
     });%>
  <td><span class=" price"><%= $.number( square*count, 2, ',', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( delivery, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( montag, '0,00', ' ' ) %></span></td>
  <td><span class="<%= approx %>-approx price"><%= Routine.priceToStr( price*count+montag+delivery, '0,00', ' ' ) %></span></td>
</script>


<script id="ExternalServiceTableItemTemplate" type="text/template">
  <td>
    <input type="checkbox" class="cb-item" />
  </td>
  <td><%= number?number:App.getProductionNumber(obj) %></td>
  <td><%= name %></td>
  <td><%= type?type:"Неизвестно" %></td>
  <td><span class="<%= approx %>-approx"><%= Routine.priceToStr( price, '0,00', ' ' ) %></span></td>
  <td>
    <% if(!by_production) { %>
          (вся продукция)
    <% } else { %>
      <% /*группируем юниты по продукции */ %>
      <% var prod_gr = {}; %>
      <% for(var i in service_units) { %>
            <% var u = service_units[i]; %>
            <% if(u.production_id in prod_gr)
                prod_gr[u.production_id].push(u.unit_number);
              else prod_gr[u.production_id] = [u.unit_number]; %>
          <% } %>
          <% /* выводим группы */ %>
          <% for(var i in prod_gr) { %>
             <% for(var j in productions) { %>
               <% if(productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= productions[j].number?productions[j].number:App.getProductionNumber(productions[j])+". "+productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <% for(var j in parent_productions) { %>
               <% if(parent_productions[j]._id==i) { %>
                <div class="line">
                  Наименование: <%= parent_productions[j].number+". "+parent_productions[j].name  %>
                </div>
               <% break; }  %>
             <% } %>

             <div class="line">
              Ед. продукции:
              <% for(var k in prod_gr[i]) { %><%= ((k==0)?'':', ')+prod_gr[i][k] %><% } %>
             </div>
          <% } %>
    <% } %>
  </td>
</script>


<script id="draftErrorsTemplate" type="text/template">
  <% if(obj.errors && obj.errors.length>0) {%>
    <div class="draft-errors">
      <h3>Ошибки договора</h3>
      <ul>
        <% for(var i=0;i<obj.errors.length;++i) {%>
          <li><%= (i+1)+". "+obj.errors[i] %></li>
        <% } %>
      </ul>
    </div>
  <% } %>
</script>



<script id="globalHistoryTemplate" type="text/template">
  <% var cnt = 0; %>
  <table class="table comments-table">
    <tbody>
      <tr>
        <th>Дата</th>
        <th>Автор</th>
        <th>Объект</th>
        <th>Действие</th>
      </tr>
      <% for(var i=0;i<(obj.change_history || []).length;++i) {%>
          <% var chist = change_history[i];
          if(chist.additional_id) { cnt++; %>
        <tr>
          <td><%= Routine.convertDateToLocalTime(chist["date"]) %></td>
          <td><a href="mailto:<%= chist["user_email"] %>?subject=" target = "_blank"><%= App.ALL_USERS[chist["user_email"]] %></a></td>
          <td><% if(chist.object_type=='payment') {
                var pay = null;
                var index = 1;
                obj.payments.each(function(item,i){
                  if(item.get('_id')==chist['object_id']){
                    pay = item;
                    index = i+1;
                    return false;
                  }
                });
              if(pay!=null) { %>
                Платеж № <%= index %> (<%= pay.get('payment_type').name %>)
              <% } } else
              if (chist.object_type=='production') {
                var prod = null;
                obj.productions.each(function(item){
                  if(item.get('_id')==chist['object_id']){
                    prod= item;
                  }
                });
                if(prod!=null) { %>
                   Позиция №<%= prod.get('number')?prod.get('number'):App.getProductionNumber(prod) %> (<%= prod.get('name') %>)
                <%}
              } else if(chist.object_type=='order_positions') {%>
                Договорные позиции
              <%  }%>
            </td>
            <td>
              <%= (chist.operation=='create')?"Создано на основании ДС ":((chist.operation=='delete')?"Удалено на основании ДС ":"Изменено на основании ДС " ) %><%= chist.additional_id?('№'+chist.additional_number):'' %>
            </td>
        </tr>
      <% } } %>
      <% if(cnt==0) { %>
        <tr>
          <td colspan="4" style="text-align: center;">Для договора нет записей в истории изменений</td>
        </tr>
      <% } %>
    </tbody>
  </table>
</script>
