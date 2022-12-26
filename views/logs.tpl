%import json
%def scripts():

    <script src="/static/scripts/libs/jquery.tokeninput.js?v={{version}}"></script>
  <script src="/static/scripts/libs/jquery.number.min.js?v={{version}}"></script>
  <script src="/static/scripts/libs/moment.min.js?v={{version}}"></script>
  <script src="/static/scripts/logs.js?v={{version}}"></script>
%end
%rebase master_page/base page_title='CRM. Логи', current_user=current_user, version=version, scripts=scripts,menu=menu


<script id="orderTableItemTemplate" type="text/template">
<div class="span1"><a data-id="<%= id %>" href="javascript:;" class="show-order" ><%= datetime %></a></div>
<div class="span2"><%= manager %></div>
<div class="span3"><%= client %></div>
<div class="span4"><%= structure %></div>
<div class="span1"><%= $.number( price, 0, ',', ' ' ) %></div>
</script>

<script id="orderTableTemplate" type="text/template">
<div class="span12">
<div id="logs-find-form" class="span12" >
    <div class="row">
       <div class="span5">
      <div class="row form-inline">
        <label class="span1 text-right" for="client-dropdown">Клиент:</label>
        <div class="span4">
          <input type="hidden" id="client-dropdown">
        </div>
      </div>
    </div>
    <div class="span5">
        <div class="row form-inline">
        <label class="span2 text-right" for="manager-filter">Менеджер:&nbsp;&nbsp;&nbsp;</label>
          <select class="span3" id="manager-filter">
                <option value="all">Все</option>
                %for row in users:
                  <option value="{{row['email']}}">{{row['email']}}</option>
                %end
          </select>
        </div>
    </div>
    <div class="span2">
    </div>
  </div>
</div>

    <div class="row">
      <div class="span12 order-table"></div>
    </div>
    <div class="row">
      <div class="span12 paginator">
        <ul class="pager">
          <li class="previous">
            <a href="javascript:;" class="prev-page">&larr; Предыдущие</a>
          </li>
          <li class="next">
            <a href="javascript:;" class="next-page" >Следующие &rarr;</a>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
</script>


<div class="span12">
  <div class="row">
    <div class="span2"></div>
    <div class="span8"></div>
    <div class="span2"></div>
  </div>
</div>

<div id="order-modal" class="modal hide" tabindex="-1" role="dialog" aria-hidden="true"></div>


<div id="client-orders-list" style="display:none;" ></div>
