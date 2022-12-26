$.ajaxSetup({timeout:50000});
$( document ).ajaxComplete(function( event, xhr, settings ) {
      if(settings.suppressErrors)
            return;
      try
      {
          var foo = jQuery.parseJSON(xhr.responseText);
          if ('mess' in foo)
          {
            _.each(foo['mess'], function(item){
                  var msg = '';
                  var cb = function(e, m, o)
                  {
                      $.blockUI({'message':'<img src="/static/img/spinner.gif">', 'css':{'border':'none', 'backgroundColor':'transparent'}, 'overlayCSS':{'backgroundColor':'#fff', 'cursor':'pointer'}});
                      var a_check = $.get("/handlers/checkorderok/"+item['type']+"/"+item['order_id'], {}, "json");
                      a_check.success(function(data){
                          // if (data.result == 'no')
                          //     return false;
                          // else
                            $(e).remove();
                      });
                      a_check.always(function(){$.unblockUI();});
                      return false;
                  };
                  var msg_type = "error"; // вид сообщения (ошибка, сообщение)
                  if (item['order_number'] == undefined && item['number'] != undefined){
                    item['order_number'] = item['number'];
                  }
                  if (item['type'] === 'ps'){
                    msg = 'Необходимо установить точную цену и состав заявки <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                  }
                  else if (item['type'] === 'p'){
                    msg = 'Необходимо установить точную цену заявки <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                  }
                  else if (item['type'] === 's'){
                    msg = 'Необходимо установить точный состав заявки <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                  }
                  else if (item['type'] === 'de'){
                    msg = 'Срок нахождения заявки <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a> в текущем состоянии превышен. Требуется дальнейшее движение по заявке или перевод её в одно из закрывающих состояний.';
                  }
                  else if (item['type'] === 'empty_finish_date'){
                     msg = 'Вероятность выше 50% и нет даты закрытия. Заявка: <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                  }
                  else if (item['type'] === 'task_overdue'){
                     msg = 'Просроченная задача: '+item['condition']+'. Заявка: <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                  }
                  else if (item['type'] === 'task_today'){
                    msg = 'Задача: '+item['condition']+'. Заявка: <a href="/crm/'+item['order_number']+'">'+item['order_number']+'</a>.';
                    msg_type = "msg";
                  }
                  showmsg(msg, true, cb, item['type']+item['order_id'], msg_type);
            });
          }
        }
        catch(err){}
  });

function getloc(dt){
    if (dt && moment(dt, 'DD.MM.YYYY HH:mm:ss').isValid())
      dt = moment.utc(dt, 'DD.MM.YYYY HH:mm:ss').local().format('DD.MM.YYYY HH:mm:ss');
    return dt;
}

function urlToObj(url){
  var regex = /[?&]([^=#]+)=([^&#]*)/g,
        params = {},
        match;
    while(match = regex.exec(url)) {
        params[match[1]] = match[2].replace(new RegExp("\\_",'g'),' ');
    }
    return params;
}

function mergeObjs(to,from){
    for(var a in from)
    {
        to[a] = from[a];
    }
}
