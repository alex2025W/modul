
%def scripts():
  <!--CSS-->
  <link href="/static/css/token-input-facebook.css?v={{version}}" rel="stylesheet" media="screen">
  <link href="/static/css/token-input.css?v={{version}}" rel="stylesheet" media="screen">
  <!--JS-->
  <script src="/static/scripts/libs/jquery.tokeninput.tst.js?v={{version}}"></script>
  <script src="/static/scripts/libs/bootstrap-editable.min.js?v={{version}}"></script>
  <script src="static/scripts/routine.js?v={{version}}"></script>
  <!---->
  <script src="/frontend/directory/scripts/app.js?v={{version}}1"></script>

%end

%rebase master_page/base page_title='CRM. Справочники', current_user=current_user, version=version, scripts=scripts, menu=menu

<script id="dirItemTemplate" type="text/template">
  <tr class="<%= stat %>">
    <td><%= cnt %></td>
    <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите название"  ><span data-id="<%= id %>"><%= name %></span></a></td>
    <td><input data-id="<%= id %>" type="checkbox" class="is-enabled" checked></td>
  </tr>
</script>

<script id="orderPositionTemplate" type="text/template">
  <tr class="<%= stat %>">
    <td><%= cnt %></td>
    <td><a href="javascript:;" data-name="name" class="editable" data-type="textarea" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите позицию"  ><span data-id="<%= id %>"><%= name %></span></a></td>
    <td><a href="javascript:;" data-name="note" class="editable" data-type="textarea" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите разъяснение позиции" class="edit-dir"><span data-id="<%= id %>"><%= note %></span></a></td>
    <td><input data-id="<%= name %>" type="checkbox" class="is-enabled" checked></td>
  </tr>
</script>

<script id="priceItemTemplate" type="text/template">
  <tr class="<%= stat %>">
    <td><%= cnt %></td>
    <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите название"  ><span data-id="<%= id %>"><%= name %></span></a></td>
      <td><a href="javascript:;" data-name="note" class="editable" data-type="text" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите заметку" class="edit-dir"><span data-id="<%= id %>"><%= note %></span></a></td>
    <td><input data-id="<%= name %>" type="checkbox" class="is-enabled event-need"></td>
    <td><input data-id="<%= name %>" type="checkbox" class="is-enabled" checked></td>
  </tr>
</script>

<script id="dirItemTemplate2" type="text/template">
  <tr class="<%= stat %>">
    <td><%= cnt %></td>
    <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите название" ><span data-id="<%= id %>"><%= name %></span></a></td>
    <td><span><%= property %></span></td>
    <td><a href="javascript:;" data-name="number" class="editable2" data-type="text" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите номер" ><span data-id="<%= id %>"><%= number %></span></a></td>
    <td><input data-id="<%= id %>" type="checkbox" class="is-enabled" checked></td>
    <td><input data-id="<%= id %>" type="checkbox" class="is-price"></td>
    <td><input data-id="<%= id %>" type="checkbox" class="is-structure"></td>
    <td><input data-id="<%= id %>" type="checkbox" class="is-sq"></td>
  </tr>
</script>

<div class="accordion" id="accordion2">
  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#first-contact">
    Первый контакт:
    </a>
  </div>
  <div id="first-contact" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 1]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#where-find">
    Откуда о нас узнали:
    </a>
  </div>
  <div id="where-find" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %where = [i for i in dicts if i['type'] == 2]
    %for row in where:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#order-status">
    Состояние заявки:
    </a>
  </div>
  <div id="order-status" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Состояние</strong></th>
      <th><strong>Срок, дн.</strong></th>
      <th><strong>Сортировка</strong></th>
      <th><strong>Включен</strong></th>
      <th><strong>Точная цена</strong></th>
      <th><strong>Точный состав</strong></th>
      <th><strong>Точная площадь</strong></th>

      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 3]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        <td><span>{{row['property']}}</span></td>
        %checked = ''
        %pr = ''
        %st = ''
        %sq = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        %if  'price' in row and row['price']=='enabled':
          %pr='checked'
        %end
        %if 'structure' in row and row['structure']=='enabled':
          %st='checked'
        %end
         %if 'sq' in row and row['sq']=='enabled':
          %sq='checked'
        %end
        <td>
          <a href="javascript:;" data-name="days" class="editable3" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите срок (дней)" ><span>{{row['days']}}</span></a>
          %if row['name'] == OrderConditions['INTEREST']:
          <span data-toggle="tooltip" data-placement="bottom" title="По истечению этого срока заявки, в состоянии 'Интерес' переводятся в состояние 'Отказ' с причиной 'Автозакрытие'." >?</span>
          %end
        </td>
        <td><a href="javascript:;" data-name="number" class="editable2" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите номер" ><span>{{row['number']}}</span></a></td>
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-price" {{pr}}></td>
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-structure" {{st}}></td>
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-sq" {{sq}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline order-property-form">
      <input type="text" class="new-dir-name">
      <select name="property" class="property">
      <option selected value="начальное">начальное</option>
      <option  value="промежуточное">промежуточное</option>
      <option  value="сон">сон</option>
      <option  value="закрывающее">закрывающее</option>
      </select>
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#construction-type">
    Тип конструкции:
    </a>
  </div>
  <div id="construction-type" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 4]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end

        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#construction-target">
    Назначение конструкции:
    </a>
  </div>
  <div id="construction-target" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 5]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
   <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#tasks">
    Задачи:
    </a>
  </div>
  <div id="tasks" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 6]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>
   <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#otkaz">
    Причины отказа:
    </a>
  </div>
  <div id="otkaz" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 7]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

 <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#rassm">
    Причины состояния "Рассматривают":
    </a>
  </div>
  <div id="rassm" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %first_contact = [i for i in dicts if i['type'] == 13]
    %for row in first_contact:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" ><span>{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion8" href="#claims-category">
    Претензии. Категории:
    </a>
  </div>
  <div id="claims-category" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %where = [i for i in dicts if i['type'] == 8]
    %for row in where:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion9" href="#kind-services">
    Виды услуг:
    </a>
  </div>
  <div id="kind-services" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %where = [i for i in dicts if i['type'] == 9]
    %for row in where:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion10" href="#warehouse">
    Склады:
    </a>
  </div>
  <div id="warehouse" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %where = [i for i in dicts if i['type'] == 10]
    %for row in where:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

  <div class="accordion-group">
  <div class="accordion-heading">
    <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion12" href="#clienttype">
    Форма организации:
    </a>
  </div>
  <div id="clienttype" class="accordion-body collapse out">
    <div class="accordion-inner">
    <table class="table table-striped">
      <thead>
      <tr>
      <th><strong>ID</strong></th>
      <th><strong>Значение</strong></th>
      <th><strong>Включен</strong></th>
      </tr>
      </thead>
      <tbody>
    %cnt = 0
    %where = [i for i in dicts if i['type'] == 12]
    %for row in where:
      %cnt = cnt+1
      <tr class="{{row['stat']}}">
        <td>{{cnt}}</td>
        <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
        %checked = ''
        %if (row['stat']=='enabled'):
          %checked='checked'
        %end
        <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
      </tr>
      %end
      </tbody>
    </table>
     <form class="form-inline">
      <input type="text" class="new-dir-name">
      <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
    </form>
    </div>
  </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion15" href="#inboxtype">
      Тип корреспонденции:
      </a>
    </div>
    <div id="inboxtype" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
        <tr>
        <th><strong>ID</strong></th>
        <th><strong>Значение</strong></th>
        <th><strong>Включен</strong></th>
        </tr>
        </thead>
        <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 15]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}">
          <td>{{cnt}}</td>
          <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
          %checked = ''
          %if (row['stat']=='enabled'):
            %checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        </tr>
        %end
        </tbody>
      </table>
       <form class="form-inline">
        <input type="text" class="new-dir-name">
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion11" href="#ABCclassification">
      ABC-классификация:
      </a>
    </div>
    <div id="ABCclassification" class="accordion-body collapse out">
      <div class="accordion-inner">
      <div class="abc-data form-horizontal">
        %where = [i for i in dicts if i['type'] == 11]
        %row = where[0] if len(where)>0 else None
        <input type="hidden" value="{{str(row['_id']) if row else '' }}" class="abc_id" />
        <fieldset>
        <legend>Блок "Клиент"</legend>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Клиент категории А</b>, если сумма по всем подписанным договорам больше:</label>
          <div class="span4">
          <input type="text" class="client-a-sum" value="{{row['client_a_sum'] if row and 'client_a_sum' in row else ''}}">&nbsp;&nbsp;руб.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Клиент категории С</b>, если сумма по всем подписанным договорам меньше:</label>
          <div class="span4">
          <input type="text"  class="client-c-sum" value="{{row['client_c_sum'] if row and 'client_c_sum' in row else ''}}">&nbsp;&nbsp;руб.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Клиент категории А</b>, если общая площадь по всем подписанным договорам больше:</label>
          <div class="span4">
          <input type="text" class="client-a-square" value="{{row['client_a_square'] if row and 'client_a_square' in row else ''}}">&nbsp;&nbsp;кв. м.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Клиент категории С</b>, если общая площадь по всем подписанным договорам меньше:</label>
          <div class="span4">
          <input type="text" class="client-c-square" value="{{row['client_c_square'] if row and 'client_c_square' in row else ''}}">&nbsp;&nbsp;кв. м.
          </div>
        </div>
        </fieldset>
        <fieldset>
        <legend>Блок "Заявка"</legend>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Заявка категории А</b>, если сумма в руб. по Итого больше:</label>
          <div class="span4">
          <input type="text" class="order-a-sum" value="{{row['order_a_sum'] if row and 'order_a_sum' in row else ''}}">&nbsp;&nbsp;руб.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Заявка категории С</b>, если сумма в руб. по Итого меньше:</label>
          <div class="span4">
          <input type="text" class="order-c-sum" value="{{row['order_c_sum'] if row and 'order_c_sum' in row else ''}}">&nbsp;&nbsp;руб.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Заявка категории А</b>, если общая площадь больше</label>
          <div class="span4">
          <input type="text" class="order-a-square" value="{{row['order_a_square'] if row and 'order_a_square' in row else ''}}">&nbsp;&nbsp;кв. м.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Заявка категории С</b>, если общая площадь меньше:</label>
          <div class="span4">
          <input type="text" class="order-c-square" value="{{row['order_c_square'] if row and 'order_c_square' in row else ''}}">&nbsp;&nbsp;кв. м.
          </div>
        </div>
        </fieldset>
        <div class="span12 text-right" style="margin-bottom:20px;">
        <button class="btn btn-success btn-abc-save">Сохранить</button>
        </div>
      </div>
      </div>
    </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion14" href="#standartcosts">
      Стандартные цены:
      </a>
    </div>
    <div id="standartcosts" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
        <tr>
        <th><strong>ID</strong></th>
        <th><strong>Название</strong></th>
        <th><strong>Значение</strong></th>
        </tr>
        </thead>
        <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 14]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}">
          <td>{{cnt}}</td>
          <td><span>{{ row['name'] }}</span></td>
          <td><input type="text" value="{{ row['value'] }}" data-id="{{ row['_id'] }}" data-name="{{ row['name'] }}" data-number="{{ row['number'] }}" /></td>
        </tr>
        %end
        </tbody>
      </table>
      </div>
    </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion16" href="#payment_type">
      Виды платежей:
      </a>
    </div>
    <div id="payment_type" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
        <tr>
        <th><strong>ID</strong></th>
        <th><strong>Значение</strong></th>
        <th><strong>Заметка</strong></th>
        <th><strong>Событие</strong></th>
        <th><strong>Включен</strong></th>
        </tr>
        </thead>
        <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 16]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}">
          <td>{{cnt}}</td>
          <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
          <td><a href="javascript:;" data-name="note" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите заметку" class="edit-dir"><span data-id="{{row['note']}}">{{row['note']}}</span></a></td>
          %event_checked = ''
          %if (row['need_event']):
            %event_checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled event-need" {{event_checked}}></td>
          %checked = ''
          %if (row['stat']=='enabled'):
            %checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        </tr>
        %end
        </tbody>
      </table>
       <form class="form-inline">
        <input placeholder="Значение" type="text" class="new-dir-name">&nbsp;
        <input placeholder="Заметка" type="text" class="new-dir-note">&nbsp;
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion2" href="#order_position">
      Договорные позиции:
      </a>
    </div>
    <div id="order_position" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
        <tr>
        <th><strong>ID</strong></th>
        <th><strong>Позиция</strong></th>
        <th><strong>Разъяснение позиции</strong></th>
        <th><strong>Включен</strong></th>
        </tr>
        </thead>
        <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 17]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}">
          <td>{{cnt}}</td>
          <td><a href="javascript:;" data-name="name" class="editable" data-type="textarea" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите позицию" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
          <td><a href="javascript:;" data-name="note" class="editable" data-type="textarea" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите разъяснение позиции " class="edit-dir"><span data-id="{{row['note']}}">{{row['note']}}</span></a></td>
          %checked = ''
          %if (row['stat']=='enabled'):
            %checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        </tr>
        %end
        </tbody>
      </table>
       <form class="form-inline">
        <textarea placeholder="Позиция" class="new-dir-name"></textarea>&nbsp;
        <textarea placeholder="Разъяснение позиции" class="new-dir-note"></textarea>&nbsp;
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

   <!--СПРАВОЧНИК НАПРАВЛЕНИЙ РАБОТ ДЛЯ УЧАСТКОВ-->
  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion18" href="#sector_type">
      Направления работ:
      </a>
    </div>
    <div id="sector_type" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
        <tr>
        <th><strong>ID</strong></th>
        <th><strong>Направление</strong></th>
        <th><strong>Ответственные</strong></th>
        <th><strong>Сортировка</strong></th>
        <th><strong>Включен</strong></th>
        </tr>
        </thead>
        <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 18]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}" data-id="{{row['name']}}" >
          <td>{{cnt}}</td>
          <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
          <td class = "resposible-users-row">
            <input type="text" style="width:400px" class="responsible-users" />
            <input type="hidden"  class="htb-responsible-users" value = "{{row['users']}}" />
          </td>
          <td><a href="javascript:;" data-name="number" class="editable2" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите номер" ><span>{{row['number']}}</span></a></td>
          %checked = ''
          %if (row['stat']=='enabled'):
            %checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        </tr>
        %end
        </tbody>
      </table>
       <form class="form-inline">
        <input placeholder="Направление" type="text" class="new-dir-name">&nbsp;
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

  <!-- Справочник - сроки -->
  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion19" href="#terms">
      Сроки:
      </a>
    </div>
    <div id="terms" class="accordion-body collapse out">
      <div class="accordion-inner">
      <div class="terms-data form-horizontal">
        %where = [i for i in dicts if i['type'] == 19]
        %row = where[0] if len(where)>0 else None
        <input type="hidden" value="{{str(row['_id']) if row else '' }}" class="terms_id" />
        <fieldset>
        <legend style = "line-height: 20px;">
          Кол-во календарных дней на монтаж 1000 м2
          <span style = "font-size: 12px;" ><br>Здание в стандартной комплектации (включая электрику и сантехнику), без мебели, доп. оборудования и т.п.</span>
        </legend>

        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Здание в 1 этаж:</b></label>
          <div class="span4">
          <input type="text" class="one-floor-building" value="{{row['one_floor_building'] if row and 'one_floor_building' in row else ''}}">&nbsp;&nbsp;дн.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Здание в 2 этажа:</b></label>
          <div class="span4">
          <input type="text" class="two-floor-building" value="{{row['two_floor_building'] if row and 'two_floor_building' in row else ''}}">&nbsp;&nbsp;дн.
          </div>
        </div>
        <div class="control-group">
          <label class="span8 text-right" style="padding-top:4px;"><b>Здание в 3 этажа:</b></label>
          <div class="span4">
          <input type="text" class="three-floor-building" value="{{row['three_floor_building'] if row and 'three_floor_building' in row else ''}}">&nbsp;&nbsp;дн.
          </div>
        </div>
        </fieldset>
        <div class="span12 text-right" style="margin-bottom:20px;">
        <button class="btn btn-success btn-terms-save">Сохранить</button>
        </div>
      </div>
      </div>
    </div>
  </div>

  <!--Табель учёта раб. времени-->
  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion20" href="#time_sheet">
        Табель учёта раб. времени:
      </a>
    </div>
    <div id="time_sheet" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
          <tr>
            <th><strong>ID</strong></th>
            <th><strong>Ключ</strong></th>
            <th><strong>Название</strong></th>
            <th><strong>Включен</strong></th>
          </tr>
        </thead>
        <tbody>
          %cnt = 0
          %where = [i for i in dicts if i['type'] == 20]
          %for row in where:
            %cnt = cnt+1
            <tr class="{{row['stat']}}">
              <td>{{cnt}}</td>
              <td><a href="javascript:;" data-name="name" class="editable" data-type="textarea" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите ключ" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
              <td><a href="javascript:;" data-name="note" class="editable" data-type="textarea" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите разъяснение " class="edit-dir"><span data-id="{{row['note']}}">{{row['note']}}</span></a></td>
              %checked = ''
              %if (row['stat']=='enabled'):
                %checked='checked'
              %end
              <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
            </tr>
            %end
        </tbody>
      </table>
       <form class="form-inline">
        <textarea placeholder="Ключ" class="new-dir-name"></textarea>&nbsp;
        <textarea placeholder="Название" class="new-dir-note"></textarea>&nbsp;
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

  <div class="accordion-group">
    <div class="accordion-heading">
      <a class="accordion-toggle" data-toggle="collapse" data-parent="#accordion21" href="#material_tags">
      Метки материалов:
      </a>
    </div>
    <div id="material_tags" class="accordion-body collapse out">
      <div class="accordion-inner">
      <table class="table table-striped">
        <thead>
          <tr>
            <th><strong>ID</strong></th>
            <th><strong>Значение</strong></th>
            <th><strong>Включен</strong></th>
          </tr>
        </thead>
      <tbody>
      %cnt = 0
      %where = [i for i in dicts if i['type'] == 21]
      %for row in where:
        %cnt = cnt+1
        <tr class="{{row['stat']}}">
          <td>{{cnt}}</td>
          <td><a href="javascript:;" data-name="name" class="editable" data-type="text" data-pk="{{row['name']}}" data-url="/handlers/upddir" data-title="Введите название" class="edit-dir"><span data-id="{{row['name']}}">{{row['name']}}</span></a></td>
          %checked = ''
          %if (row['stat']=='enabled'):
            %checked='checked'
          %end
          <td><input data-id="{{row['name']}}" type="checkbox" class="is-enabled" {{checked}}></td>
        </tr>
        %end
        </tbody>
      </table>
       <form class="form-inline">
        <input type="text" class="new-dir-name">
        <a href="javascript:;" class="btn add-new">+&nbsp;Добавить</a>
      </form>
      </div>
    </div>
  </div>

  <!---ШАБЛОН ДЛЯ ОТОБРАЖЕНИЯ ЭЛЕМЕНТА-->
  <script id="sectorTypeItemTemplate" type="text/template">
    <tr class="<%= stat %>" data-id="<%= name %>" >
      <td><%= cnt %></td>
      <td><a href="javascript:;" data-name="name" class="editable" data-type="textarea" data-pk="<%= name %>" data-url="/handlers/upddir" data-title="Введите позицию"  ><span data-id="<%= id %>"><%= name %></span></a></td>
      <td>
        <input type="text" style="width:400px" class="responsible-users" />
        <input type="hidden"  class="htb-responsible-users" value = '[]' />
      </td>
      <td><a href="javascript:;" data-name="number" class="editable2" data-type="text" data-pk="<%=name%>" data-url="/handlers/upddir" data-title="Введите номер" ><span data-id="<%= id %>"><%= number %></span></a></td>
      <td><input data-id="<%= name %>" type="checkbox" class="is-enabled" checked></td>
    </tr>
  </script>
  <!---->
</div>
