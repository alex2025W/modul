/*
* val - id выбранного клиента
* name - имя выбранного клиента
* is_group - является ли выбранный элемент группой
*
*/

(function( $ ){

  //var handlers = null;

  var methods = {
    init : function( options ) {
        options = options;
        var source = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          remote: {
            url: options.url || '/handlers/clientfind/notcl?q=%QUERY',            
            wildcard: '%QUERY',
            transform: options.transform || function(response){
              return response.result
            }
          }
        });

        $(this).typeahead(null, {
          display: 'name',
          source: source,
          highlight:true,
          limit:Infinity,          
          templates: {
              suggestion: options.formatTemplate || function (data) {
                  var group = '';
                  if (data.group){
                      group = '<div class="group">Группа: "' + data.group + '" </div>'
                  }
                  var result = '<div data-id="' + data.id + '" class="tt-suggestion tt-selectable">' + group + data.name;
                  result += '<span class="cont">&nbsp' + data.cont + '</span>';
                  if(data.is_podpisant){
                    result+='<br><span class="cont">Подписант договора</span>';
                  }
                  result +='</div>';
                  return result;
              },
              notFound:function(){
                return '<div class="tt-suggestion"><b>Ничего не найдено</b></div>';
              }
          }
        }).on('typeahead:selected', function(el, data){
              $(this).data('id', data.id);
              $(this).data('data', data);
              options.onSelect(data);
              return true;
           });
    },
    get : function( ) {
        return $(this).data('data');
    },
    is_group : function( ) {
        return $(this).data('data').id.indexOf('gr_') > -1
    },
    clear : function( ) {
        $(this).removeAttr('data-id', '');
        return $(this).typeahead('val', '');
    },
    set : function(value) {
        $(this).data('data', value);
        return $(this).typeahead('val', value.name);
    }
  };

  $.fn.clientFinder = function( method ) {
    
    // логика вызова метода
    if ( methods[method] ) {
      return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ));
    } else if ( typeof method === 'object' || ! method ) {
      return methods.init.apply( this, arguments );
    } else {
      $.error( 'Метод с именем ' +  method + ' не существует для jQuery.clientFinder' );
    }
  };

})( jQuery );